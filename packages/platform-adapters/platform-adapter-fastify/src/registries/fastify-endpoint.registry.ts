import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  HTTP_METHODS,
  HttpEndpointRegistrationError,
  type HttpMethodType,
  type IHttpEndpoint,
  type IHttpEndpointRegistrar,
  type IHttpEndpointRegistrarProvider,
} from '@prosto/platform-sdk/platform';
import { FastifyHttpApplicationError } from '../errors/index.js';

type EndpointRegistryStateType = 'collecting' | 'sealed';
type EndpointOwnerScopeStateType = 'open' | 'committed' | 'rolled-back';

interface IEndpointOwnerScope {
  state: EndpointOwnerScopeStateType;
}

interface IRegisteredEndpoint {
  readonly canonicalKey: string;
  readonly canonicalPath: string;
  readonly endpoint: IHttpEndpoint;
  readonly ownerId: string;
}

const PARAMETER_SEGMENT_PATTERN = /^:([A-Za-z][A-Za-z0-9_]*)$/u;
const LITERAL_SEGMENT_PATTERN =
  /^(?:[A-Za-z0-9\-._~!$&'()+,;=@]|%[0-9A-Fa-f]{2})+$/u;
const RESERVED_PATHS = new Set(['/health', '/health/', '/ready', '/ready/']);
const MAXIMUM_PATH_LENGTH = 2048;

/** @internal Transactional endpoint collector used by FastifyHttpApplication. */
export class FastifyEndpointRegistry implements IHttpEndpointRegistrarProvider {
  private readonly declarationsByKey = new Map<string, IRegisteredEndpoint>();
  private readonly ownerScopes = new Map<string, IEndpointOwnerScope>();

  private declarations: readonly IRegisteredEndpoint[] = [];
  private state: EndpointRegistryStateType = 'collecting';

  createRegistrar(moduleId: string): IHttpEndpointRegistrar {
    this.ensureCollecting();

    const scope = this.ownerScopes.get(moduleId);

    if (scope !== undefined) {
      this.ensureOpenScope(moduleId, scope);
    } else {
      this.ownerScopes.set(moduleId, { state: 'open' });
    }

    return {
      register: (endpoint: IHttpEndpoint): void => {
        this.register(moduleId, endpoint);
      },
    };
  }

  commit(moduleId: string): void {
    const scope = this.getOrCreateScope(moduleId);

    if (scope.state === 'open') {
      scope.state = 'committed';
    }
  }

  rollback(moduleId: string): void {
    const scope = this.getOrCreateScope(moduleId);

    if (scope.state === 'rolled-back') {
      return;
    }

    scope.state = 'rolled-back';

    this.declarations = this.declarations.filter(
      (declaration) => declaration.ownerId !== moduleId,
    );

    for (const [key, declaration] of this.declarationsByKey) {
      if (declaration.ownerId === moduleId) {
        this.declarationsByKey.delete(key);
      }
    }
  }

  activate(
    fastify: FastifyInstance,
    startedModuleIds: ReadonlySet<string>,
    createRouteHandler: (
      endpoint: IHttpEndpoint,
      moduleId: string,
    ) => RouteHandlerMethod,
  ): void {
    this.state = 'sealed';

    const activeDeclarations = this.declarations
      .filter((declaration) => {
        const scope = this.ownerScopes.get(declaration.ownerId);

        return (
          scope?.state === 'committed' &&
          startedModuleIds.has(declaration.ownerId)
        );
      })
      .sort(compareDeclarations);

    try {
      for (const declaration of activeDeclarations) {
        fastify.route({
          method: declaration.endpoint.method,
          url: declaration.endpoint.path,
          handler: createRouteHandler(
            declaration.endpoint,
            declaration.ownerId,
          ),
        });
      }
    } catch (cause: unknown) {
      throw new FastifyHttpApplicationError(
        'FASTIFY_HTTP_APPLICATION_ROUTE_ACTIVATION_FAILED',
        'HTTP route activation failed.',
        { phase: 'route-activation' },
        { cause },
      );
    }
  }

  private getOrCreateScope(moduleId: string): IEndpointOwnerScope {
    const scope = this.ownerScopes.get(moduleId);

    if (scope !== undefined) {
      return scope;
    }

    const newScope: IEndpointOwnerScope = { state: 'open' };

    this.ownerScopes.set(moduleId, newScope);

    return newScope;
  }

  private register(moduleId: string, endpoint: IHttpEndpoint): void {
    this.ensureCollecting();

    const scope = this.ownerScopes.get(moduleId);

    if (scope === undefined) {
      throw new HttpEndpointRegistrationError(
        'REGISTRATION_SCOPE_CLOSED',
        'The endpoint registration scope is closed.',
        { ownerId: moduleId },
      );
    }

    this.ensureOpenScope(moduleId, scope);

    const declaration = this.validateAndCopyEndpoint(endpoint);
    const existingDeclaration = this.declarationsByKey.get(
      declaration.canonicalKey,
    );

    if (existingDeclaration !== undefined) {
      throw new HttpEndpointRegistrationError(
        'HTTP_ENDPOINT_CONFLICT',
        'The endpoint conflicts with an existing declaration.',
        {
          method: declaration.endpoint.method,
          path: declaration.endpoint.path,
          canonicalPath: declaration.canonicalPath,
          conflictingOwnerId: existingDeclaration.ownerId,
          ownerId: moduleId,
        },
      );
    }

    const registeredDeclaration: IRegisteredEndpoint = {
      ...declaration,
      ownerId: moduleId,
    };

    this.declarationsByKey.set(
      registeredDeclaration.canonicalKey,
      registeredDeclaration,
    );
    this.declarations = [...this.declarations, registeredDeclaration];
  }

  private validateAndCopyEndpoint(
    endpoint: unknown,
  ): Omit<IRegisteredEndpoint, 'ownerId'> {
    const details = getEndpointDetails(endpoint);

    if (!isEndpointDeclaration(endpoint)) {
      throw new HttpEndpointRegistrationError(
        'HTTP_ENDPOINT_INVALID',
        'The endpoint declaration must provide a supported method, path, and handler.',
        details,
      );
    }

    if (!HTTP_METHODS.includes(endpoint.method)) {
      throw new HttpEndpointRegistrationError(
        'HTTP_ENDPOINT_INVALID',
        'The endpoint method is not supported.',
        details,
      );
    }

    if (typeof endpoint.handler !== 'function') {
      throw new HttpEndpointRegistrationError(
        'HTTP_ENDPOINT_INVALID',
        'The endpoint handler must be callable.',
        details,
      );
    }

    const canonicalPath = validatePath(endpoint.path, details);
    const copiedEndpoint = Object.freeze({
      method: endpoint.method,
      path: endpoint.path,
      handler: endpoint.handler as IHttpEndpoint['handler'],
    });

    return {
      canonicalKey: `${endpoint.method} ${canonicalPath}`,
      canonicalPath,
      endpoint: copiedEndpoint,
    };
  }

  private ensureCollecting(): void {
    if (this.state === 'sealed') {
      throw new HttpEndpointRegistrationError(
        'HTTP_ENDPOINT_REGISTRY_SEALED',
        'The endpoint registry is sealed.',
      );
    }
  }

  private ensureOpenScope(moduleId: string, scope: IEndpointOwnerScope): void {
    if (scope.state !== 'open') {
      throw new HttpEndpointRegistrationError(
        'REGISTRATION_SCOPE_CLOSED',
        'The endpoint registration scope is closed.',
        { ownerId: moduleId },
      );
    }
  }
}

function isEndpointDeclaration(endpoint: unknown): endpoint is {
  readonly method: HttpMethodType;
  readonly path: string;
  readonly handler: unknown;
} {
  return typeof endpoint === 'object' && endpoint !== null;
}

function getEndpointDetails(endpoint: unknown): {
  readonly method?: string;
  readonly path?: string;
} {
  if (typeof endpoint !== 'object' || endpoint === null) {
    return {};
  }

  const candidate = endpoint as Record<string, unknown>;

  return {
    ...(typeof candidate.method === 'string'
      ? { method: candidate.method }
      : {}),
    ...(typeof candidate.path === 'string' ? { path: candidate.path } : {}),
  };
}

function validatePath(
  path: string,
  details: { readonly method?: string; readonly path?: string },
): string {
  if (
    path.length === 0 ||
    path.length > MAXIMUM_PATH_LENGTH ||
    !path.startsWith('/') ||
    path.includes('?') ||
    path.includes('#') ||
    path.includes('\\')
  ) {
    throwInvalidPath(details);
  }

  if (RESERVED_PATHS.has(path)) {
    throw new HttpEndpointRegistrationError(
      'HTTP_ENDPOINT_RESERVED_PATH',
      'The endpoint path is reserved for platform probes.',
      details,
    );
  }

  if (path === '/') {
    return path;
  }

  const hasTrailingSlash = path.length > 1 && path.endsWith('/');
  const segments = path.slice(1, hasTrailingSlash ? -1 : undefined).split('/');
  const parameterNames = new Set<string>();
  const canonicalSegments: string[] = [];

  for (const [index, segment] of segments.entries()) {
    if (segment.length === 0 || segment === '.' || segment === '..') {
      throwInvalidPath(details);
    }

    const parameterMatch = PARAMETER_SEGMENT_PATTERN.exec(segment);
    if (parameterMatch !== null) {
      const parameterName = parameterMatch[1];
      if (parameterName === undefined) {
        throwInvalidPath(details);
      }

      if (parameterNames.has(parameterName)) {
        throwInvalidPath(details);
      }

      parameterNames.add(parameterName);
      canonicalSegments.push(':');
      continue;
    }

    if (segment === '*') {
      if (index !== segments.length - 1 || hasTrailingSlash) {
        throwInvalidPath(details);
      }

      canonicalSegments.push('*');
      continue;
    }

    if (!LITERAL_SEGMENT_PATTERN.test(segment)) {
      throwInvalidPath(details);
    }

    canonicalSegments.push(segment);
  }

  return `/${canonicalSegments.join('/')}${hasTrailingSlash ? '/' : ''}`;
}

function throwInvalidPath(details: {
  readonly method?: string;
  readonly path?: string;
}): never {
  throw new HttpEndpointRegistrationError(
    'HTTP_ENDPOINT_INVALID',
    'The endpoint path does not use the supported platform path grammar.',
    details,
  );
}

function compareDeclarations(
  left: IRegisteredEndpoint,
  right: IRegisteredEndpoint,
): number {
  return (
    compareStrings(left.ownerId, right.ownerId) ||
    compareStrings(left.endpoint.path, right.endpoint.path) ||
    compareStrings(left.endpoint.method, right.endpoint.method)
  );
}

function compareStrings(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}
