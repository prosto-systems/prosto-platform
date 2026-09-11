import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  HTTP_METHODS,
  HttpEndpointRegistrationError,
  type HttpMethodType,
  type IHttpEndpoint,
  type IHttpEndpointRegistrar,
  type IHttpEndpointRegistrarProvider,
  type IPlatformRuntimeComponentIdentity,
} from '@prosto/platform-sdk/platform';
import { FastifyHttpAdapterError } from '../errors/index.js';

type EndpointRegistryStateType = 'collecting' | 'sealed';
type EndpointOwnerScopeStateType = 'open' | 'committed' | 'rolled-back';

interface IEndpointOwnerScope {
  readonly owner: IPlatformRuntimeComponentIdentity;
  state: EndpointOwnerScopeStateType;
}

interface IRegisteredEndpoint {
  readonly canonicalKey: string;
  readonly canonicalPath: string;
  readonly endpoint: IHttpEndpoint;
  readonly owner: IPlatformRuntimeComponentIdentity;
}

const PARAMETER_SEGMENT_PATTERN = /^:([A-Za-z][A-Za-z0-9_]*)$/u;
const LITERAL_SEGMENT_PATTERN =
  /^(?:[A-Za-z0-9\-._~!$&'()+,;=@]|%[0-9A-Fa-f]{2})+$/u;
const PLATFORM_ADMIN_OWNER: IPlatformRuntimeComponentIdentity = {
  type: 'adapter',
  id: 'platform-admin',
};
const MAXIMUM_PATH_LENGTH = 2048;

/** @internal Transactional endpoint collector used by the Fastify transport. */
export class FastifyEndpointRegistry implements IHttpEndpointRegistrarProvider {
  private readonly declarationsByKey = new Map<string, IRegisteredEndpoint>();
  private readonly ownerScopes = new Map<string, IEndpointOwnerScope>();

  private declarations: readonly IRegisteredEndpoint[] = [];
  private state: EndpointRegistryStateType = 'collecting';

  createRegistrar(
    owner: IPlatformRuntimeComponentIdentity,
  ): IHttpEndpointRegistrar {
    this.ensureCollecting();

    const scopedOwner = this.copyOwner(owner);
    const key = this.ownerKey(scopedOwner);
    const scope = this.ownerScopes.get(key);

    if (scope !== undefined) {
      this.ensureOpenScope(scopedOwner, scope);
    } else {
      this.ownerScopes.set(key, {
        owner: scopedOwner,
        state: 'open',
      });
    }

    return {
      register: (endpoint: IHttpEndpoint): void => {
        this.register(scopedOwner, endpoint);
      },
    };
  }

  commit(owner: IPlatformRuntimeComponentIdentity): void {
    const scope = this.getOrCreateScope(owner);

    if (scope.state === 'open') {
      scope.state = 'committed';
    }
  }

  rollback(owner: IPlatformRuntimeComponentIdentity): void {
    const ownerKey = this.ownerKey(owner);
    const scope = this.getOrCreateScope(owner);

    if (scope.state === 'rolled-back') {
      return;
    }

    scope.state = 'rolled-back';

    this.declarations = this.declarations.filter(
      (declaration) => this.ownerKey(declaration.owner) !== ownerKey,
    );

    for (const [key, declaration] of this.declarationsByKey) {
      if (this.ownerKey(declaration.owner) === ownerKey) {
        this.declarationsByKey.delete(key);
      }
    }
  }

  activate(
    fastify: FastifyInstance,
    createRouteHandler: (
      endpoint: IHttpEndpoint,
      owner: IPlatformRuntimeComponentIdentity,
    ) => RouteHandlerMethod,
  ): void {
    this.state = 'sealed';

    const activeDeclarations = this.declarations
      .filter((declaration) => {
        const scope = this.ownerScopes.get(this.ownerKey(declaration.owner));

        return scope?.state === 'committed';
      })
      .sort(compareDeclarations);

    try {
      for (const declaration of activeDeclarations) {
        fastify.route({
          method: declaration.endpoint.method,
          url: declaration.endpoint.path,
          handler: createRouteHandler(declaration.endpoint, declaration.owner),
        });
      }
    } catch (cause: unknown) {
      throw new FastifyHttpAdapterError(
        'FASTIFY_HTTP_ADAPTER_ROUTE_ACTIVATION_FAILED',
        'HTTP route activation failed.',
        { phase: 'route-activation' },
        { cause },
      );
    }
  }

  private getOrCreateScope(
    owner: IPlatformRuntimeComponentIdentity,
  ): IEndpointOwnerScope {
    const key = this.ownerKey(owner);
    const scope = this.ownerScopes.get(key);

    if (scope !== undefined) {
      return scope;
    }

    const newScope: IEndpointOwnerScope = {
      owner: this.copyOwner(owner),
      state: 'open',
    };

    this.ownerScopes.set(key, newScope);

    return newScope;
  }

  private register(
    owner: IPlatformRuntimeComponentIdentity,
    endpoint: IHttpEndpoint,
  ): void {
    this.ensureCollecting();

    const scope = this.ownerScopes.get(this.ownerKey(owner));

    if (scope === undefined) {
      throw new HttpEndpointRegistrationError(
        'REGISTRATION_SCOPE_CLOSED',
        'The endpoint registration scope is closed.',
        { ownerId: owner.id, ownerType: owner.type },
      );
    }

    this.ensureOpenScope(owner, scope);

    const declaration = this.validateAndCopyEndpoint(endpoint);
    this.assertOwnerMayDeclarePath(owner, declaration.endpoint.path);
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
          conflictingOwnerId: existingDeclaration.owner.id,
          conflictingOwnerType: existingDeclaration.owner.type,
          ownerId: owner.id,
          ownerType: owner.type,
        },
      );
    }

    const registeredDeclaration: IRegisteredEndpoint = {
      ...declaration,
      owner: this.copyOwner(owner),
    };

    this.declarationsByKey.set(
      registeredDeclaration.canonicalKey,
      registeredDeclaration,
    );
    this.declarations = [...this.declarations, registeredDeclaration];
  }

  private validateAndCopyEndpoint(
    endpoint: unknown,
  ): Omit<IRegisteredEndpoint, 'owner'> {
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

  private assertOwnerMayDeclarePath(
    owner: IPlatformRuntimeComponentIdentity,
    path: string,
  ): void {
    if (this.isTransportPath(path)) {
      throw new HttpEndpointRegistrationError(
        'HTTP_ENDPOINT_RESERVED_PATH',
        'The endpoint path is reserved for transport infrastructure probes.',
        { ownerId: owner.id, ownerType: owner.type, path },
      );
    }

    if (
      this.isAdminNamespace(path) &&
      (owner.type !== PLATFORM_ADMIN_OWNER.type ||
        owner.id !== PLATFORM_ADMIN_OWNER.id)
    ) {
      throw new HttpEndpointRegistrationError(
        'HTTP_ENDPOINT_RESERVED_PATH',
        'The endpoint path is reserved for the platform admin adapter.',
        { ownerId: owner.id, ownerType: owner.type, path },
      );
    }
  }

  private ensureOpenScope(
    owner: IPlatformRuntimeComponentIdentity,
    scope: IEndpointOwnerScope,
  ): void {
    if (scope.state !== 'open') {
      throw new HttpEndpointRegistrationError(
        'REGISTRATION_SCOPE_CLOSED',
        'The endpoint registration scope is closed.',
        { ownerId: owner.id, ownerType: owner.type },
      );
    }
  }

  private isAdminNamespace(path: string): boolean {
    return (
      path === '/api/admin' ||
      path.startsWith('/api/admin/') ||
      path === '/modules' ||
      path.startsWith('/modules/')
    );
  }

  private isTransportPath(path: string): boolean {
    return (
      path === '/health' ||
      path.startsWith('/health/') ||
      path === '/ready' ||
      path.startsWith('/ready/')
    );
  }

  private ownerKey(owner: IPlatformRuntimeComponentIdentity): string {
    return `${owner.type}:${owner.id}`;
  }

  private copyOwner(
    owner: IPlatformRuntimeComponentIdentity,
  ): IPlatformRuntimeComponentIdentity {
    return Object.freeze({ type: owner.type, id: owner.id });
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
    compareStrings(left.owner.type, right.owner.type) ||
    compareStrings(left.owner.id, right.owner.id) ||
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
