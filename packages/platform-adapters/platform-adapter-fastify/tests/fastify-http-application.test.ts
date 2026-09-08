import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN,
  HTTP_REQUEST_GATE_SERVICE_TOKEN,
  type IHttpApplicationRuntime,
  type IHttpEndpointRegistrarProvider,
  type IHttpRequestGate,
  type IServiceRegistry,
  type ServiceTokenType,
} from '@prosto/platform-sdk/platform';
import { describe, expect, it, vi } from 'vitest';
import {
  FastifyHttpApplication,
  FastifyHttpApplicationError,
} from '../src/index.js';

describe('FastifyHttpApplication lifecycle', () => {
  it('rejects invalid transport configuration before creating a runtime', () => {
    // Arrange
    const runtimeFactory = vi.fn(() => new TestRuntime());

    // Act
    const _createApplication = (): FastifyHttpApplication =>
      new FastifyHttpApplication({
        port: -1,
        runtimeFactory,
      });

    // Assert
    expect(_createApplication).toThrow(FastifyHttpApplicationError);
    expect(runtimeFactory).not.toHaveBeenCalled();
  });

  it('starts the runtime, activates started module routes, and publishes probes', async () => {
    // Arrange
    let registrarProvider: IHttpEndpointRegistrarProvider | undefined;
    const runtime = new TestRuntime(['orders']);
    runtime.onStart = (): void => {
      const registrar = registrarProvider?.createRegistrar('orders');

      if (registrar === undefined) {
        throw new Error('HTTP endpoint registrar was not composed.');
      }

      registrar.register({
        method: 'GET',
        path: '/api/orders',
        handler: () => Response.json({ orders: [] }),
      });
      registrarProvider?.commit('orders');
    };
    const application = new FastifyHttpApplication({
      host: '127.0.0.1',
      port: 0,
      runtimeFactory: (configureHttpServices) => {
        configureHttpServices(
          createServiceRegistry((provider) => {
            registrarProvider = provider;
          }),
        );

        return runtime;
      },
    });

    // Act
    await application.start();
    const healthResponse = await fetch(new URL('/health', application.url));
    const readinessResponse = await fetch(new URL('/ready', application.url));
    const endpointResponse = await fetch(
      new URL('/api/orders', application.url),
    );

    // Assert
    expect(application.state).toBe('listening');
    expect(application.url).toBeInstanceOf(URL);
    expect(runtime.start).toHaveBeenCalledOnce();
    expect(await healthResponse.json()).toMatchObject({ status: 'healthy' });
    expect(await readinessResponse.json()).toMatchObject({
      status: 'ready',
      ready: true,
      startedModuleIds: ['orders'],
    });
    expect(endpointResponse.status).toBe(200);
    expect(await endpointResponse.json()).toEqual({ orders: [] });

    await application.stop();
    expect(application.state).toBe('stopped');
    expect(runtime.stop).toHaveBeenCalledOnce();
  });

  it('rejects a runtime factory that omits HTTP service composition', async () => {
    // Arrange
    const runtime = new TestRuntime();
    const application = new FastifyHttpApplication({
      port: 0,
      runtimeFactory: () => runtime,
    });

    // Act
    const start = application.start();

    // Assert
    await expect(start).rejects.toMatchObject({
      code: 'FASTIFY_HTTP_APPLICATION_SERVICE_COMPOSITION_FAILED',
    });
    expect(runtime.start).not.toHaveBeenCalled();
    expect(application.state).toBe('failed');
  });

  it('rejects duplicate HTTP service composition before runtime startup', async () => {
    // Arrange
    const runtime = new TestRuntime();
    const application = new FastifyHttpApplication({
      port: 0,
      runtimeFactory: (configureHttpServices) => {
        const services = createServiceRegistry(() => undefined);
        configureHttpServices(services);
        configureHttpServices(services);

        return runtime;
      },
    });

    // Act
    const start = application.start();

    // Assert
    await expect(start).rejects.toMatchObject({
      code: 'FASTIFY_HTTP_APPLICATION_SERVICE_COMPOSITION_FAILED',
    });
    expect(runtime.start).not.toHaveBeenCalled();
  });

  it('cleans up a runtime that resolves without starting', async () => {
    // Arrange
    const runtime = new TestRuntime();
    runtime.start.mockImplementation(async (): Promise<void> => undefined);
    const application = createApplication(runtime);

    // Act
    const start = application.start();

    // Assert
    await expect(start).rejects.toMatchObject({
      code: 'FASTIFY_HTTP_APPLICATION_RUNTIME_STARTUP_FAILED',
    });
    expect(runtime.start).toHaveBeenCalledOnce();
    expect(runtime.stop).toHaveBeenCalledOnce();
    expect(application.state).toBe('failed');
  });

  it('shares in-flight start and stop operations and remains single-use', async () => {
    // Arrange
    const runtime = new TestRuntime();
    const application = createApplication(runtime);

    // Act
    const firstStart = application.start();
    const secondStart = application.start();
    await Promise.all([firstStart, secondStart]);
    const firstStop = application.stop();
    const secondStop = application.stop();
    await Promise.all([firstStop, secondStop]);

    // Assert
    expect(firstStart).toBe(secondStart);
    expect(firstStop).toBe(secondStop);
    expect(runtime.start).toHaveBeenCalledOnce();
    expect(runtime.stop).toHaveBeenCalledOnce();
    await expect(application.start()).rejects.toBeInstanceOf(
      FastifyHttpApplicationError,
    );
  });

  it('waits for startup before stopping the runtime', async () => {
    // Arrange
    let allowStartup: (() => void) | undefined;
    const runtime = new TestRuntime();
    runtime.start.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          allowStartup = (): void => {
            runtime.started = true;
            resolve();
          };
        }),
    );
    const application = createApplication(runtime);

    // Act
    const start = application.start();
    const stop = application.stop();
    allowStartup?.();
    await Promise.all([start, stop]);

    // Assert
    expect(runtime.start).toHaveBeenCalledOnce();
    expect(runtime.stop).toHaveBeenCalledOnce();
    expect(application.state).toBe('stopped');
  });

  it('becomes stopped when stopped before startup', async () => {
    // Arrange
    const runtime = new TestRuntime();
    const application = createApplication(runtime);

    // Act
    await application.stop();

    // Assert
    expect(application.state).toBe('stopped');
    expect(runtime.stop).not.toHaveBeenCalled();
    await expect(application.start()).rejects.toMatchObject({
      code: 'FASTIFY_HTTP_APPLICATION_RUNTIME_STARTUP_FAILED',
    });
  });

  it('maps parsed and raw request data to a neutral endpoint context', async () => {
    // Arrange
    let registrarProvider: IHttpEndpointRegistrarProvider | undefined;
    const runtime = new TestRuntime(['http-module']);
    runtime.onStart = (): void => {
      const registrar = registrarProvider?.createRegistrar('http-module');

      if (registrar === undefined) {
        throw new Error('HTTP endpoint registrar was not composed.');
      }

      registrar.register({
        method: 'POST',
        path: '/api/context/:id',
        handler: (context) => {
          if (context.body.kind !== 'json') {
            throw new Error('Expected parsed JSON.');
          }

          return Response.json({
            method: context.method,
            id: context.params.id,
            query: context.query.tag,
            header: context.headers['x-example'],
            body: context.body.value,
            path: context.url.pathname,
          });
        },
      });
      registrar.register({
        method: 'POST',
        path: '/api/raw',
        handler: async (context) => {
          if (context.body.kind !== 'stream') {
            throw new Error('Expected raw stream.');
          }

          return new Response(await new Response(context.body.stream).text());
        },
      });
      registrarProvider?.commit('http-module');
    };
    const application = createApplicationWithProvider(runtime, (provider) => {
      registrarProvider = provider;
    });

    // Act
    await application.start();
    const jsonResponse = await fetch(
      new URL('/api/context/42?tag=first&tag=second', application.url),
      {
        method: 'POST',
        headers: {
          'content-type': 'application/problem+json',
          'x-correlation-id': 'request-42',
          'x-example': 'untrusted',
        },
        body: JSON.stringify({ enabled: true }),
      },
    );
    const rawResponse = await fetch(new URL('/api/raw', application.url), {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: 'raw payload',
    });

    // Assert
    expect(await jsonResponse.json()).toEqual({
      method: 'POST',
      id: '42',
      query: ['first', 'second'],
      header: 'untrusted',
      body: { enabled: true },
      path: '/api/context/42',
    });
    expect(jsonResponse.headers.get('x-correlation-id')).toBe('request-42');
    expect(await rawResponse.text()).toBe('raw payload');

    await application.stop();
  });

  it('returns sanitized errors with a correlation ID', async () => {
    // Arrange
    let registrarProvider: IHttpEndpointRegistrarProvider | undefined;
    const runtime = new TestRuntime(['http-module']);
    runtime.onStart = (): void => {
      const registrar = registrarProvider?.createRegistrar('http-module');

      if (registrar === undefined) {
        throw new Error('HTTP endpoint registrar was not composed.');
      }

      registrar.register({
        method: 'POST',
        path: '/api/json',
        handler: () => Response.json({ unreachable: true }),
      });
      registrar.register({
        method: 'POST',
        path: '/api/limited',
        handler: async (context) => {
          if (context.body.kind !== 'stream') {
            throw new Error('Expected raw stream.');
          }

          await new Response(context.body.stream).arrayBuffer();

          return new Response(null, { status: 204 });
        },
      });
      registrarProvider?.commit('http-module');
    };
    const application = createApplicationWithProvider(
      runtime,
      (provider) => {
        registrarProvider = provider;
      },
      { rawBodyLimitBytes: 3 },
    );

    // Act
    await application.start();
    const malformedJsonResponse = await fetch(
      new URL('/api/json', application.url),
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': 'json-error',
        },
        body: '{',
      },
    );
    const oversizedResponse = await fetch(
      new URL('/api/limited', application.url),
      {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: 'four',
      },
    );
    const missingRouteResponse = await fetch(
      new URL('/missing', application.url),
      { headers: { 'x-correlation-id': 'missing-route' } },
    );

    // Assert
    expect(malformedJsonResponse.status).toBe(400);
    expect(await malformedJsonResponse.json()).toEqual({
      code: 'invalid_request',
      correlationId: 'json-error',
    });
    expect(oversizedResponse.status).toBe(413);
    expect(await oversizedResponse.json()).toMatchObject({
      code: 'payload_too_large',
    });
    expect(missingRouteResponse.status).toBe(404);
    expect(await missingRouteResponse.json()).toEqual({
      code: 'not_found',
      correlationId: 'missing-route',
    });

    await application.stop();
  });

  it('maps multipart parts in order without buffering uploaded files', async () => {
    // Arrange
    let registrarProvider: IHttpEndpointRegistrarProvider | undefined;
    const runtime = new TestRuntime(['http-module']);
    runtime.onStart = (): void => {
      const registrar = registrarProvider?.createRegistrar('http-module');

      if (registrar === undefined) {
        throw new Error('HTTP endpoint registrar was not composed.');
      }

      registrar.register({
        method: 'POST',
        path: '/api/upload',
        handler: async (context) => {
          if (context.body.kind !== 'multipart') {
            throw new Error('Expected multipart body.');
          }

          const parts: unknown[] = [];

          for await (const part of context.body.parts) {
            if (part.kind === 'field') {
              parts.push({
                kind: part.kind,
                name: part.name,
                value: part.value,
              });
            } else {
              parts.push({
                kind: part.kind,
                name: part.name,
                filename: part.filename,
                content: await new Response(part.stream).text(),
              });
            }
          }

          return Response.json(parts);
        },
      });
      registrarProvider?.commit('http-module');
    };
    const application = createApplicationWithProvider(runtime, (provider) => {
      registrarProvider = provider;
    });
    const form = new FormData();
    form.append('title', 'release');
    form.append(
      'file',
      new Blob(['streamed upload'], { type: 'text/plain' }),
      'release.txt',
    );

    // Act
    await application.start();
    const response = await fetch(new URL('/api/upload', application.url), {
      method: 'POST',
      body: form,
    });

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { kind: 'field', name: 'title', value: 'release' },
      {
        kind: 'file',
        name: 'file',
        filename: 'release.txt',
        content: 'streamed upload',
      },
    ]);

    await application.stop();
  });

  it('maps forwarded metadata only from configured trusted proxies', async () => {
    // Arrange
    let registrarProvider: IHttpEndpointRegistrarProvider | undefined;
    const runtime = new TestRuntime(['http-module']);
    runtime.onStart = (): void => {
      const registrar = registrarProvider?.createRegistrar('http-module');

      if (registrar === undefined) {
        throw new Error('HTTP endpoint registrar was not composed.');
      }

      registrar.register({
        method: 'GET',
        path: '/api/metadata',
        handler: (context) =>
          Response.json({
            protocol: context.protocol,
            host: context.host,
            remoteAddress: context.remoteAddress,
          }),
      });
      registrarProvider?.commit('http-module');
    };
    const application = createApplicationWithProvider(
      runtime,
      (provider) => {
        registrarProvider = provider;
      },
      { trustedProxies: ['127.0.0.0/8'] },
    );

    // Act
    await application.start();
    const response = await fetch(new URL('/api/metadata', application.url), {
      headers: {
        'x-forwarded-for': '203.0.113.9',
        'x-forwarded-host': 'admin.example.test',
        'x-forwarded-proto': 'https',
      },
    });

    // Assert
    expect(await response.json()).toEqual({
      protocol: 'https',
      host: 'admin.example.test',
      remoteAddress: '203.0.113.9',
    });

    await application.stop();
  });

  it('rejects a gated request before its body reaches an endpoint handler', async () => {
    // Arrange
    let registrarProvider: IHttpEndpointRegistrarProvider | undefined;
    const handler = vi.fn(() => Response.json({ unreachable: true }));
    const requestGate: IHttpRequestGate = {
      evaluate: vi.fn(async () => ({
        allowed: false as const,
        status: 503 as const,
        code: 'maintenance',
      })),
    };
    const runtime = new TestRuntime(['http-module']);
    runtime.onStart = (): void => {
      const registrar = registrarProvider?.createRegistrar('http-module');

      if (registrar === undefined) {
        throw new Error('HTTP endpoint registrar was not composed.');
      }

      registrar.register({
        method: 'POST',
        path: '/api/orders',
        handler,
      });
      registrarProvider?.commit('http-module');
    };
    const application = createApplicationWithProvider(
      runtime,
      (provider) => {
        registrarProvider = provider;
      },
      {},
      requestGate,
    );

    // Act
    await application.start();
    const response = await fetch(new URL('/api/orders', application.url), {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: 'unread body',
    });

    // Assert
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'maintenance' });
    expect(handler).not.toHaveBeenCalled();
    expect(requestGate.evaluate).toHaveBeenCalledWith({
      method: 'POST',
      pathname: '/api/orders',
      remoteAddress: '127.0.0.1',
    });

    await application.stop();
  });

  it('fails closed for gate errors on business paths without masking probes', async () => {
    // Arrange
    const requestGate: IHttpRequestGate = {
      evaluate: vi.fn(async () => {
        throw new Error('Database unavailable.');
      }),
    };
    const application = createApplicationWithProvider(
      new TestRuntime(),
      () => undefined,
      {},
      requestGate,
    );

    // Act
    await application.start();
    const businessResponse = await fetch(
      new URL('/api/unavailable', application.url),
    );
    const healthResponse = await fetch(new URL('/health', application.url));

    // Assert
    expect(businessResponse.status).toBe(503);
    expect(await businessResponse.json()).toMatchObject({
      code: 'request_gate_unavailable',
    });
    expect(healthResponse.status).toBe(200);

    await application.stop();
  });

  it('serves shell files with cache, security, and SPA fallback policies', async () => {
    // Arrange
    const shellRoot = join(
      tmpdir(),
      `prosto-platform-shell-${crypto.randomUUID()}`,
    );
    await mkdir(join(shellRoot, 'assets'), { recursive: true });
    await writeFile(
      join(shellRoot, 'index.html'),
      '<!doctype html><title>Admin</title>',
    );
    await writeFile(join(shellRoot, 'assets', 'app-ABCD1234.js'), 'export {};');
    const application = new FastifyHttpApplication({
      port: 0,
      runtimeFactory: (configureHttpServices) => {
        configureHttpServices(createServiceRegistry(() => undefined));
        return new TestRuntime();
      },
      staticSite: { rootPath: shellRoot },
    });

    try {
      // Act
      await application.start();
      const assetResponse = await fetch(
        new URL('/assets/app-ABCD1234.js', application.url),
      );
      const indexResponse = await fetch(new URL('/', application.url));
      const fallbackResponse = await fetch(
        new URL('/workspace/orders', application.url),
        { headers: { accept: 'text/html' } },
      );
      const apiResponse = await fetch(
        new URL('/api/missing', application.url),
        {
          headers: { accept: 'text/html' },
        },
      );
      const headResponse = await fetch(
        new URL('/assets/app-ABCD1234.js', application.url),
        { method: 'HEAD' },
      );

      // Assert
      expect(await assetResponse.text()).toBe('export {};');
      expect(assetResponse.headers.get('cache-control')).toBe(
        'public, max-age=31536000, immutable',
      );
      expect(assetResponse.headers.get('x-content-type-options')).toBe(
        'nosniff',
      );
      expect(assetResponse.headers.get('content-security-policy')).toContain(
        "default-src 'self'",
      );
      expect(indexResponse.headers.get('cache-control')).toBe('no-cache');
      expect(await fallbackResponse.text()).toContain('<title>Admin</title>');
      expect(apiResponse.status).toBe(404);
      expect(headResponse.status).toBe(200);
      expect(await headResponse.text()).toBe('');
    } finally {
      await application.stop();
      await rm(shellRoot, { recursive: true, force: true });
    }
  });
});

class TestRuntime implements IHttpApplicationRuntime {
  started = false;
  degraded = false;
  stopped = false;
  onStart: (() => void) | undefined;
  readonly start = vi.fn(async (): Promise<void> => {
    this.onStart?.();
    this.started = true;
  });
  readonly stop = vi.fn(async (): Promise<void> => {
    this.stopped = true;
  });

  constructor(readonly startedModuleIds: readonly string[] = []) {}
}

function createApplication(
  runtime: IHttpApplicationRuntime,
): FastifyHttpApplication {
  return new FastifyHttpApplication({
    port: 0,
    runtimeFactory: (configureHttpServices) => {
      configureHttpServices(createServiceRegistry(() => undefined));

      return runtime;
    },
  });
}

function createApplicationWithProvider(
  runtime: IHttpApplicationRuntime,
  onProviderRegistered: (provider: IHttpEndpointRegistrarProvider) => void,
  options: Omit<
    ConstructorParameters<typeof FastifyHttpApplication>[0],
    'runtimeFactory'
  > = {},
  requestGate?: IHttpRequestGate,
): FastifyHttpApplication {
  return new FastifyHttpApplication({
    port: 0,
    ...options,
    runtimeFactory: (configureHttpServices) => {
      configureHttpServices(
        createServiceRegistry(onProviderRegistered, requestGate),
      );

      return runtime;
    },
  });
}

function createServiceRegistry(
  onProviderRegistered: (provider: IHttpEndpointRegistrarProvider) => void,
  requestGate?: IHttpRequestGate,
): IServiceRegistry {
  return {
    register: <TService>(
      token: ServiceTokenType<TService>,
      service: NoInfer<TService>,
    ): void => {
      if (token === HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN) {
        onProviderRegistered(service as IHttpEndpointRegistrarProvider);
      }
    },
    override: <TService>(
      _token: ServiceTokenType<TService>,
      _service: NoInfer<TService>,
    ): void => undefined,
    resolve: <TService>(
      token: ServiceTokenType<TService>,
    ): TService | undefined =>
      token === HTTP_REQUEST_GATE_SERVICE_TOKEN
        ? (requestGate as TService | undefined)
        : undefined,
    resolveRequired: <TService>(
      _token: ServiceTokenType<TService>,
    ): TService => {
      throw new Error('No services are registered in this test.');
    },
    has: <TService>(_token: ServiceTokenType<TService>): boolean => false,
    unregister: <TService>(_token: ServiceTokenType<TService>): void =>
      undefined,
  };
}
