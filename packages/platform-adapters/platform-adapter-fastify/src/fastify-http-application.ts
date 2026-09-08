import { readFile, realpath, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import Fastify, {
  type FastifyBodyParser,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type RouteHandlerMethod,
} from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import {
  HTTP_METHODS,
  HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN,
  HTTP_REQUEST_GATE_SERVICE_TOKEN,
  type HttpApplicationStateType,
  type HttpMethodType,
  HttpRequestBodyError,
  type IHttpApplication,
  type IHttpApplicationRuntime,
  type IHttpEndpoint,
  type IHttpErrorResponse,
  type IHttpRequestGate,
  type IHttpHealthResponse,
  type IHttpReadinessResponse,
  type IPlatformModuleLogger,
  type IServiceRegistry,
  type ServiceRegistryConfiguratorType,
} from '@prosto/platform-sdk/platform';
import { FastifyHttpApplicationError } from '@/errors/index.js';
import type { IFastifyHttpApplicationOptions } from '@/interfaces/index.js';
import { FastifyEndpointRegistry } from '@/registries/fastify-endpoint.registry.js';
import {
  createCountingStream,
  createParsedTextBody,
  createRawStreamBody,
  FastifyRequestContextMapper,
  HttpTransportError,
  parseJsonBody,
} from '@/request-mapping/fastify-request-context.mapper.js';
import {
  applicationOptionsSchema,
  type FastifyHttpApplicationConfigurationType,
} from '@/schemas/index.js';
import { createTrustedProxyMatcher } from '@/trusted-proxy/trusted-proxy.matcher.js';
import {
  isHttpApplicationRuntime,
  isPayloadTooLargeError,
  isPlatformModuleLogger,
  isUnsupportedMediaTypeError,
  resolvesWithin,
} from '@/utils/index.js';

/**
 * @alpha
 * Fastify-backed platform HTTP application.
 *
 * It owns runtime startup, endpoint activation, listening, and ordered shutdown.
 */
export class FastifyHttpApplication implements IHttpApplication {
  private readonly configuration: FastifyHttpApplicationConfigurationType;
  private readonly endpointRegistry = new FastifyEndpointRegistry();
  private readonly shutdownController = new AbortController();
  private readonly logger: IPlatformModuleLogger | undefined;
  private readonly correlationIds = new WeakMap<object, string>();

  private fastify: FastifyInstance | undefined;
  private runtime: IHttpApplicationRuntime | undefined;
  private services: IServiceRegistry | undefined;
  private requestGate: IHttpRequestGate | undefined;
  private staticSite:
    | {
        readonly rootPath: string;
        readonly indexFileName: string;
        readonly spaFallback: boolean;
        readonly contentSecurityPolicy: string | false;
      }
    | undefined;
  private startPromise: Promise<void> | undefined;
  private stopPromise: Promise<void> | undefined;
  private startedAt: number | undefined;
  private runtimeStopAttempted = false;
  private fastifyCloseAttempted = false;
  private stopRequested = false;
  private currentState: HttpApplicationStateType = 'created';
  private currentUrl: URL | undefined;

  constructor(readonly options: IFastifyHttpApplicationOptions) {
    try {
      this.configuration = applicationOptionsSchema.parse(options);
    } catch (cause: unknown) {
      throw new FastifyHttpApplicationError(
        'FASTIFY_HTTP_APPLICATION_INVALID_CONFIGURATION',
        'Fastify HTTP application configuration is invalid.',
        { phase: 'configuration', state: this.currentState },
        { cause },
      );
    }

    if (
      typeof this.configuration.runtimeFactory !== 'function' ||
      !isPlatformModuleLogger(this.configuration.logger)
    ) {
      throw new FastifyHttpApplicationError(
        'FASTIFY_HTTP_APPLICATION_INVALID_CONFIGURATION',
        'Fastify HTTP application configuration is invalid.',
        { phase: 'configuration', state: this.currentState },
      );
    }

    this.logger = options.logger;
  }

  get state(): HttpApplicationStateType {
    return this.currentState;
  }

  get url(): URL | undefined {
    return this.currentUrl;
  }

  start(): Promise<void> {
    if (this.currentState === 'listening') {
      return Promise.resolve();
    }

    if (this.currentState === 'starting' && this.startPromise !== undefined) {
      return this.startPromise;
    }

    if (this.currentState !== 'created') {
      return Promise.reject(
        new FastifyHttpApplicationError(
          'FASTIFY_HTTP_APPLICATION_RUNTIME_STARTUP_FAILED',
          'The Fastify HTTP application cannot be started in its current state.',
          { phase: 'runtime-startup', state: this.currentState },
        ),
      );
    }

    this.currentState = 'starting';
    this.startPromise = this._startInternal();

    return this.startPromise;
  }

  stop(): Promise<void> {
    if (this.stopPromise !== undefined) {
      return this.stopPromise;
    }

    if (this.currentState === 'created') {
      this.currentState = 'stopped';
      return Promise.resolve();
    }

    if (this.currentState === 'stopped' || this.currentState === 'failed') {
      return Promise.resolve();
    }

    this.stopRequested = true;
    this.currentState = 'stopping';
    this.shutdownController.abort();
    this.stopPromise = this._stopInternal();

    return this.stopPromise;
  }

  private async _startInternal(): Promise<void> {
    try {
      this.runtime = this._createRuntime();

      await this._startRuntime(this.runtime);

      this.requestGate = this.services?.resolve(
        HTTP_REQUEST_GATE_SERVICE_TOKEN,
      );

      const tls = await this._loadTlsOptions();

      this.fastify = Fastify({
        bodyLimit: this.configuration.parsedBodyLimitBytes,
        exposeHeadRoutes: false,
        ...(tls === undefined ? {} : { https: tls }),
        keepAliveTimeout: this.configuration.keepAliveTimeoutMs,
        logger: false,
        requestTimeout: this.configuration.requestTimeoutMs,
        trustProxy: createTrustedProxyMatcher(
          this.configuration.trustedProxies,
        ),
      });

      this._configureRequestHandling(this.fastify);
      await this._configureStaticSite(this.fastify);
      this._activateRoutes(this.fastify, this.runtime);
      await this._waitForFastifyReadiness(this.fastify);

      this.currentUrl = new URL(await this._listen(this.fastify));
      this.startedAt = Date.now();

      if (!this.stopRequested) {
        this.currentState = 'listening';
      }
    } catch (cause: unknown) {
      await this._cleanupFailedStartup();
      this.currentState = 'failed';
      throw this._toStartupError(cause);
    }
  }

  private _createRuntime(): IHttpApplicationRuntime {
    let configurationCount = 0;
    let configurationClosed = false;

    const configureHttpServices: ServiceRegistryConfiguratorType = (
      services: IServiceRegistry,
    ): void => {
      if (configurationClosed || configurationCount > 0) {
        throw new FastifyHttpApplicationError(
          'FASTIFY_HTTP_APPLICATION_SERVICE_COMPOSITION_FAILED',
          'The HTTP service configurator must be invoked exactly once.',
          { phase: 'service-composition', state: this.currentState },
        );
      }

      configurationCount += 1;

      try {
        this.services = services;
        services.register(
          HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN,
          this.endpointRegistry,
        );
      } catch (cause: unknown) {
        throw new FastifyHttpApplicationError(
          'FASTIFY_HTTP_APPLICATION_SERVICE_COMPOSITION_FAILED',
          'HTTP service composition failed.',
          { phase: 'service-composition', state: this.currentState },
          { cause },
        );
      }
    };

    let runtime: unknown;

    try {
      runtime = this.options.runtimeFactory(configureHttpServices);
    } catch (cause: unknown) {
      throw this._toApplicationError(
        cause,
        'FASTIFY_HTTP_APPLICATION_SERVICE_COMPOSITION_FAILED',
        'HTTP service composition failed.',
        'service-composition',
      );
    } finally {
      configurationClosed = true;
    }

    if (configurationCount !== 1 || !isHttpApplicationRuntime(runtime)) {
      throw new FastifyHttpApplicationError(
        'FASTIFY_HTTP_APPLICATION_SERVICE_COMPOSITION_FAILED',
        'The runtime factory must invoke the HTTP service configurator exactly once.',
        { phase: 'service-composition', state: this.currentState },
      );
    }

    return runtime;
  }

  private async _startRuntime(runtime: IHttpApplicationRuntime): Promise<void> {
    try {
      await runtime.start();
    } catch (cause: unknown) {
      throw new FastifyHttpApplicationError(
        'FASTIFY_HTTP_APPLICATION_RUNTIME_STARTUP_FAILED',
        'Platform runtime startup failed.',
        { phase: 'runtime-startup', state: this.currentState },
        { cause },
      );
    }

    if (!runtime.started) {
      throw new FastifyHttpApplicationError(
        'FASTIFY_HTTP_APPLICATION_RUNTIME_STARTUP_FAILED',
        'Platform runtime did not start successfully.',
        { phase: 'runtime-startup', state: this.currentState },
      );
    }
  }

  private _activateRoutes(
    fastify: FastifyInstance,
    runtime: IHttpApplicationRuntime,
  ): void {
    try {
      this.endpointRegistry.activate(
        fastify,
        new Set(runtime.startedModuleIds),
        this._createEndpointHandler,
      );

      fastify.get('/health', () => this._createHealthResponse());
      fastify.get('/ready', () => this._createReadinessResponse());
      fastify.setNotFoundHandler(async (request, reply) => {
        if (await this._sendStaticSiteResponse(request, reply)) {
          return;
        }

        this._sendSanitizedError(reply, 404, 'not_found', request);
      });
      fastify.setErrorHandler((error, request, reply) => {
        const transportError = this._getTransportError(error);
        this._sendSanitizedError(
          reply,
          transportError.statusCode,
          transportError.code,
          request,
        );
      });
    } catch (cause: unknown) {
      throw this._toApplicationError(
        cause,
        'FASTIFY_HTTP_APPLICATION_ROUTE_ACTIVATION_FAILED',
        'HTTP route activation failed.',
        'route-activation',
      );
    }
  }

  private readonly _createEndpointHandler = (
    endpoint: IHttpEndpoint,
    moduleId: string,
  ): RouteHandlerMethod => {
    return async (request) => {
      const correlationId = this._getCorrelationId(request);
      const startedAt = Date.now();
      const mapper = new FastifyRequestContextMapper(
        this.configuration,
        this.shutdownController.signal,
      );
      const { context, cleanup, handlerTimeoutSignal } = mapper.create(
        request,
        endpoint.method,
        correlationId,
      );

      try {
        const response = await this._runHandler(
          endpoint,
          context,
          handlerTimeoutSignal,
        );

        if (!(response instanceof Response)) {
          throw new Error(
            'HTTP endpoint handler returned a non-Response value.',
          );
        }

        await cleanup.cleanup();
        this._logCompletion(
          endpoint,
          moduleId,
          response.status,
          startedAt,
          correlationId,
        );

        return this._withCorrelationId(response, correlationId);
      } catch (cause: unknown) {
        await cleanup.cleanup().catch((): void => undefined);
        this._logFailure(endpoint, moduleId, startedAt, correlationId, cause);
        throw cause;
      }
    };
  };

  private _configureRequestHandling(fastify: FastifyInstance): void {
    fastify.addHook('onRequest', async (request, reply) => {
      const requestGate = this.requestGate;
      const method = asHttpMethod(request.method);

      if (requestGate === undefined || method === undefined) {
        return;
      }

      const mapper = new FastifyRequestContextMapper(
        this.configuration,
        this.shutdownController.signal,
      );
      const metadata = mapper.createMetadata(request);

      try {
        const decision = await requestGate.evaluate({
          method,
          pathname: metadata.url.pathname,
          remoteAddress: metadata.remoteAddress,
        });

        if (decision.allowed) {
          return;
        }

        // No body parser has run yet; resume the rejected payload before replying.
        request.raw.resume();
        this._sendSanitizedError(
          reply,
          decision.status,
          decision.code,
          request,
        );
        return reply;
      } catch {
        if (!isBusinessPath(metadata.url.pathname)) {
          return;
        }

        request.raw.resume();
        this.logger?.error('HTTP request gate evaluation failed.', {
          route: metadata.url.pathname,
          method,
          errorCode: 'request_gate_unavailable',
          correlationId: this._getCorrelationId(request),
        });
        this._sendSanitizedError(
          reply,
          503,
          'request_gate_unavailable',
          request,
        );
        return reply;
      }
    });
    fastify.addHook('onSend', (request, reply, payload, done): void => {
      reply.header('x-content-type-options', 'nosniff');
      reply.header('referrer-policy', 'strict-origin-when-cross-origin');
      reply.header('x-frame-options', 'SAMEORIGIN');

      if (this.staticSite?.contentSecurityPolicy !== false) {
        reply.header(
          'content-security-policy',
          this.staticSite?.contentSecurityPolicy ??
            "default-src 'self'; base-uri 'self'; frame-ancestors 'self'",
        );
      }

      if (!reply.hasHeader('x-correlation-id')) {
        reply.header('x-correlation-id', this._getCorrelationId(request));
      }

      done(null, payload);
    });
    const jsonParser: FastifyBodyParser<string> = (
      _request,
      body,
      done,
    ): void => {
      try {
        done(null, parseJsonBody(body));
      } catch (cause: unknown) {
        done(
          cause instanceof Error
            ? cause
            : new Error('Invalid JSON request body.'),
        );
      }
    };
    const textParser: FastifyBodyParser<string> = (
      _request,
      body,
      done,
    ): void => {
      done(null, createParsedTextBody(body));
    };

    // Fastify prepends RegExp parsers, so register the fallback first.
    fastify.addContentTypeParser(/^.*$/u, (_request, payload, done): void => {
      done(
        null,
        createRawStreamBody(
          createCountingStream(payload, this.configuration.rawBodyLimitBytes),
        ),
      );
    });
    fastify.removeContentTypeParser('application/json');
    fastify.addContentTypeParser(
      'application/json',
      {
        bodyLimit: this.configuration.parsedBodyLimitBytes,
        parseAs: 'string',
      },
      jsonParser,
    );
    fastify.addContentTypeParser(
      /^application\/[A-Za-z0-9!#$&^_.+-]+\+json(?:;|$)/u,
      {
        bodyLimit: this.configuration.parsedBodyLimitBytes,
        parseAs: 'string',
      },
      jsonParser,
    );
    fastify.addContentTypeParser(
      /^text\/.+(?:;|$)/u,
      {
        bodyLimit: this.configuration.parsedBodyLimitBytes,
        parseAs: 'string',
      },
      textParser,
    );
    fastify.register(fastifyMultipart, {
      attachFieldsToBody: false,
      limits: {
        fileSize: this.configuration.multipartLimits.fileSizeBytes,
        files: this.configuration.multipartLimits.files,
        fields: this.configuration.multipartLimits.fields,
        parts: this.configuration.multipartLimits.parts,
        fieldSize: this.configuration.multipartLimits.fieldSizeBytes,
        fieldNameSize: this.configuration.multipartLimits.fieldNameSizeBytes,
        headerPairs: this.configuration.multipartLimits.headerPairs,
      },
    });
  }

  private async _configureStaticSite(fastify: FastifyInstance): Promise<void> {
    const staticSite = this.configuration.staticSite;

    if (staticSite === undefined) {
      return;
    }

    const rootPath = await realpath(staticSite.rootPath);
    const rootStats = await stat(rootPath);

    if (!rootStats.isDirectory()) {
      throw new Error('The static-site root path must resolve to a directory.');
    }

    this.staticSite = { ...staticSite, rootPath };
    // Keep static response handling inside Fastify without leaking its API.
    fastify.register(fastifyStatic, {
      root: rootPath,
      serve: false,
      cacheControl: false,
    });
  }

  private async _loadTlsOptions(): Promise<
    { readonly cert: Buffer; readonly key: Buffer } | undefined
  > {
    const tls = this.configuration.tls;

    if (tls === undefined) {
      return undefined;
    }

    const [cert, key] = await Promise.all([
      readFile(tls.certificatePath),
      readFile(tls.privateKeyPath),
    ]);

    return { cert, key };
  }

  private async _sendStaticSiteResponse(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<boolean> {
    const staticSite = this.staticSite;

    if (
      staticSite === undefined ||
      (request.method !== 'GET' && request.method !== 'HEAD')
    ) {
      return false;
    }

    const pathname = getRequestPathname(request);

    if (pathname === undefined || isStaticFallbackExcluded(pathname)) {
      return false;
    }

    const requestedFile =
      pathname === '/' ? staticSite.indexFileName : pathname.slice(1);

    if (await this._sendStaticFile(reply, requestedFile, pathname)) {
      return true;
    }

    if (
      staticSite.spaFallback &&
      acceptsHtml(request) &&
      (await this._sendStaticFile(reply, staticSite.indexFileName, '/'))
    ) {
      return true;
    }

    return false;
  }

  private async _sendStaticFile(
    reply: FastifyReply,
    relativePath: string,
    requestPathname: string,
  ): Promise<boolean> {
    const staticSite = this.staticSite;

    if (staticSite === undefined || !isSafeStaticRelativePath(relativePath)) {
      return false;
    }

    const candidatePath = resolve(
      staticSite.rootPath,
      ...relativePath.split('/'),
    );

    try {
      const realPath = await realpath(candidatePath);
      const fileStats = await stat(realPath);

      if (
        !fileStats.isFile() ||
        !isWithinDirectory(staticSite.rootPath, realPath)
      ) {
        return false;
      }
    } catch {
      return false;
    }

    this._setStaticCachePolicy(reply, relativePath, requestPathname);
    await reply.sendFile(relativePath);
    return true;
  }

  private _setStaticCachePolicy(
    reply: FastifyReply,
    relativePath: string,
    requestPathname: string,
  ): void {
    const staticSite = this.staticSite;

    if (staticSite === undefined) {
      return;
    }

    if (relativePath === staticSite.indexFileName || requestPathname === '/') {
      reply.header('cache-control', 'no-cache');
      return;
    }

    const isHashedAsset =
      requestPathname.startsWith('/assets/') &&
      /-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/u.test(relativePath);
    reply.header(
      'cache-control',
      isHashedAsset
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate',
    );
  }

  private async _runHandler(
    endpoint: IHttpEndpoint,
    context: Parameters<IHttpEndpoint['handler']>[0],
    handlerTimeoutSignal: AbortSignal,
  ): Promise<Response> {
    if (handlerTimeoutSignal.aborted) {
      throw new HttpTransportError('request_timeout', 408);
    }

    let rejectTimeout: ((reason: HttpTransportError) => void) | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      rejectTimeout = reject as (reason: HttpTransportError) => void;
    });
    const abortHandler = (): void => {
      rejectTimeout?.(new HttpTransportError('request_timeout', 408));
    };

    handlerTimeoutSignal.addEventListener('abort', abortHandler, {
      once: true,
    });

    try {
      return await Promise.race([
        Promise.resolve(endpoint.handler(context)),
        timeout,
      ]);
    } finally {
      handlerTimeoutSignal.removeEventListener('abort', abortHandler);
    }
  }

  private _getCorrelationId(request: FastifyRequest): string {
    const existingCorrelationId = this.correlationIds.get(request);

    if (existingCorrelationId !== undefined) {
      return existingCorrelationId;
    }

    const candidate = request.headers['x-correlation-id'];
    const correlationId =
      typeof candidate === 'string' &&
      /^[A-Za-z0-9._:-]{1,128}$/u.test(candidate)
        ? candidate
        : crypto.randomUUID();

    this.correlationIds.set(request, correlationId);

    return correlationId;
  }

  private _withCorrelationId(
    response: Response,
    correlationId: string,
  ): Response {
    const headers = new Headers(response.headers);
    headers.set('x-correlation-id', correlationId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  private _getTransportError(error: unknown): {
    readonly code: IHttpErrorResponse['code'];
    readonly statusCode: number;
  } {
    if (error instanceof HttpTransportError) {
      return { code: error.responseCode, statusCode: error.statusCode };
    }

    if (error instanceof HttpRequestBodyError) {
      return { code: 'payload_too_large', statusCode: 413 };
    }

    if (isPayloadTooLargeError(error)) {
      return { code: 'payload_too_large', statusCode: 413 };
    }

    if (isUnsupportedMediaTypeError(error)) {
      return { code: 'unsupported_media_type', statusCode: 415 };
    }

    return { code: 'internal_error', statusCode: 500 };
  }

  private _sendSanitizedError(
    reply: FastifyReply,
    statusCode: number,
    code: IHttpErrorResponse['code'] | string,
    request: FastifyRequest,
  ): void {
    const correlationId = this._getCorrelationId(request);
    const response: { readonly code: string; readonly correlationId: string } =
      {
        code,
        correlationId,
      };

    reply
      .header('x-correlation-id', correlationId)
      .code(statusCode)
      .send(response);
  }

  private _logCompletion(
    endpoint: IHttpEndpoint,
    moduleId: string,
    status: number,
    startedAt: number,
    correlationId: string,
  ): void {
    this.logger?.info('HTTP endpoint request completed.', {
      route: endpoint.path,
      method: endpoint.method,
      status,
      durationMs: Date.now() - startedAt,
      moduleId,
      correlationId,
    });
  }

  private _logFailure(
    endpoint: IHttpEndpoint,
    moduleId: string,
    startedAt: number,
    correlationId: string,
    error: unknown,
  ): void {
    this.logger?.error('HTTP endpoint request failed.', {
      route: endpoint.path,
      method: endpoint.method,
      durationMs: Date.now() - startedAt,
      moduleId,
      correlationId,
      errorCode: this._getTransportError(error).code,
    });
  }

  private _createHealthResponse(): Response {
    const response: IHttpHealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds:
        this.startedAt === undefined
          ? 0
          : Math.max(0, (Date.now() - this.startedAt) / 1000),
    };

    return Response.json(response);
  }

  private _createReadinessResponse(): Response {
    const runtime = this.runtime;
    const stopping = this.currentState === 'stopping';
    const ready =
      this.currentState === 'listening' &&
      runtime?.started === true &&
      !stopping;
    const reasons: IHttpReadinessResponse['reasons'] = [
      ...(this.currentState === 'listening'
        ? []
        : (['application_not_listening'] as const)),
      ...(runtime?.started === true ? [] : (['runtime_not_started'] as const)),
      ...(stopping ? (['application_stopping'] as const) : []),
    ];
    const response: IHttpReadinessResponse = {
      status: ready ? 'ready' : 'not-ready',
      ready,
      degraded: runtime?.degraded ?? false,
      startedModuleIds: runtime?.startedModuleIds ?? [],
      reasons,
      timestamp: new Date().toISOString(),
    };

    return Response.json(response, { status: ready ? 200 : 503 });
  }

  private async _waitForFastifyReadiness(
    fastify: FastifyInstance,
  ): Promise<void> {
    try {
      await fastify.ready();
    } catch (cause: unknown) {
      throw new FastifyHttpApplicationError(
        'FASTIFY_HTTP_APPLICATION_ROUTE_ACTIVATION_FAILED',
        'HTTP route activation failed.',
        { phase: 'route-activation', state: this.currentState },
        { cause },
      );
    }
  }

  private async _listen(fastify: FastifyInstance): Promise<string> {
    try {
      return await fastify.listen({
        host: this.configuration.host,
        port: this.configuration.port,
      });
    } catch (cause: unknown) {
      throw new FastifyHttpApplicationError(
        'FASTIFY_HTTP_APPLICATION_LISTEN_FAILED',
        'Fastify HTTP application could not listen.',
        { phase: 'listen', state: this.currentState },
        { cause },
      );
    }
  }

  private async _stopInternal(): Promise<void> {
    await this.startPromise?.catch((): void => undefined);

    const failures: unknown[] = [];

    try {
      await this._closeFastify();
    } catch (cause: unknown) {
      failures.push(cause);
    } finally {
      try {
        await this._stopRuntime();
      } catch (cause: unknown) {
        failures.push(cause);
      }
    }

    this.currentUrl = undefined;

    if (failures.length === 0) {
      this.currentState = 'stopped';
      return;
    }

    this.currentState = 'failed';

    throw new FastifyHttpApplicationError(
      'FASTIFY_HTTP_APPLICATION_SHUTDOWN_FAILED',
      'Fastify HTTP application shutdown failed.',
      { phase: 'shutdown', state: 'stopping' },
      {
        cause:
          failures.length === 1
            ? failures[0]
            : new AggregateError(failures, 'HTTP and runtime shutdown failed.'),
      },
    );
  }

  private async _cleanupFailedStartup(): Promise<void> {
    try {
      await this._closeFastify();
    } catch {
      // The startup error remains the externally reported cause.
    }

    try {
      await this._stopRuntime();
    } catch {
      // Runtime cleanup is best effort after an earlier startup failure.
    }

    this.currentUrl = undefined;
  }

  private async _closeFastify(): Promise<void> {
    if (this.fastify === undefined || this.fastifyCloseAttempted) {
      return;
    }

    this.fastifyCloseAttempted = true;

    const closePromise = this.fastify.close();
    const closedWithinTimeout = await resolvesWithin(
      closePromise,
      this.configuration.shutdownTimeoutMs,
    );

    if (!closedWithinTimeout) {
      this.fastify.server.closeAllConnections();
      await closePromise;
    }
  }

  private async _stopRuntime(): Promise<void> {
    if (this.runtime === undefined || this.runtimeStopAttempted) {
      return;
    }

    this.runtimeStopAttempted = true;

    await this.runtime.stop();
  }

  private _toStartupError(error: unknown): FastifyHttpApplicationError {
    return this._toApplicationError(
      error,
      'FASTIFY_HTTP_APPLICATION_RUNTIME_STARTUP_FAILED',
      'Fastify HTTP application startup failed.',
      'runtime-startup',
    );
  }

  private _toApplicationError(
    error: unknown,
    code: FastifyHttpApplicationError['code'],
    message: string,
    phase: FastifyHttpApplicationError['details']['phase'],
  ): FastifyHttpApplicationError {
    if (error instanceof FastifyHttpApplicationError) {
      return error;
    }

    return new FastifyHttpApplicationError(
      code,
      message,
      { phase, state: this.currentState },
      { cause: error },
    );
  }
}

function asHttpMethod(method: string): HttpMethodType | undefined {
  return HTTP_METHODS.includes(method as HttpMethodType)
    ? (method as HttpMethodType)
    : undefined;
}

function isBusinessPath(pathname: string): boolean {
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/modules' ||
    pathname.startsWith('/modules/')
  );
}

function getRequestPathname(request: FastifyRequest): string | undefined {
  const rawUrl = request.raw.url;

  if (rawUrl === undefined) {
    return undefined;
  }

  const rawPathname = rawUrl.split('?', 1)[0] ?? '';

  try {
    const pathname = decodeURIComponent(rawPathname);

    return pathname.startsWith('/') ? pathname : undefined;
  } catch {
    return undefined;
  }
}

function isStaticFallbackExcluded(pathname: string): boolean {
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/modules' ||
    pathname.startsWith('/modules/') ||
    pathname === '/health' ||
    pathname.startsWith('/health/') ||
    pathname === '/ready' ||
    pathname.startsWith('/ready/')
  );
}

function acceptsHtml(request: FastifyRequest): boolean {
  const accept = request.headers.accept;

  return (
    typeof accept === 'string' &&
    /(?:^|,)\s*text\/html(?:\s*;|,|$)/iu.test(accept)
  );
}

function isSafeStaticRelativePath(relativePath: string): boolean {
  return (
    relativePath.length > 0 &&
    !relativePath.includes('\\') &&
    !relativePath.includes('\0') &&
    relativePath
      .split('/')
      .every(
        (segment) => segment.length > 0 && segment !== '.' && segment !== '..',
      )
  );
}

function isWithinDirectory(rootPath: string, candidatePath: string): boolean {
  const pathFromRoot = relative(rootPath, candidatePath);

  return (
    pathFromRoot !== '' &&
    !pathFromRoot.startsWith(`..${sep}`) &&
    pathFromRoot !== '..' &&
    !resolve(rootPath, pathFromRoot).startsWith(`..${sep}`)
  );
}
