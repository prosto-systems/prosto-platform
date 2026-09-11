import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it } from 'vitest';
import {
  HttpEndpointRegistrationError,
  type IHttpEndpoint,
  type IPlatformRuntimeComponentIdentity,
} from '@prosto/platform-sdk/platform';
import { FastifyHttpAdapterError } from '../src/errors/index.js';
import { FastifyEndpointRegistry } from '../src/registries/fastify-endpoint.registry.js';

describe('FastifyEndpointRegistry', () => {
  it('copies declarations and rejects canonical route conflicts', () => {
    // Arrange
    const registry = new FastifyEndpointRegistry();
    const firstRegistrar = registry.createRegistrar(
      moduleOwner('first-module'),
    );
    const secondRegistrar = registry.createRegistrar(
      moduleOwner('second-module'),
    );
    const endpoint = createEndpoint('GET', '/items/:id');

    // Act
    firstRegistrar.register(endpoint);
    endpoint.path = '/changed';

    const conflictError = getThrownError((): void => {
      secondRegistrar.register(createEndpoint('GET', '/items/:slug'));
    });

    // Assert
    expect(conflictError).toBeInstanceOf(HttpEndpointRegistrationError);
    expect(conflictError).toMatchObject({
      code: 'HTTP_ENDPOINT_CONFLICT',
      details: {
        canonicalPath: '/items/:',
        conflictingOwnerId: 'first-module',
      },
    });
  });

  it('rejects malformed and reserved endpoint declarations', () => {
    // Arrange
    const registry = new FastifyEndpointRegistry();
    const registrar = registry.createRegistrar(moduleOwner('module'));
    const invalidPaths = [
      'relative',
      '/items?query=value',
      '/items#fragment',
      '/items\\child',
      '/items//child',
      '/items/./child',
      '/items/:id/:id',
      '/items/*/child',
      '/items/*/',
      '/items/:123',
      '/items/contains:colon',
      '/items/%not-encoded',
    ];

    // Act / Assert
    for (const path of invalidPaths) {
      expect(
        getThrownError((): void =>
          registrar.register(createEndpoint('GET', path)),
        ),
      ).toMatchObject({
        code: 'HTTP_ENDPOINT_INVALID',
      });
    }

    expect(
      getThrownError((): void =>
        registrar.register(createEndpoint('GET', '/health')),
      ),
    ).toMatchObject({ code: 'HTTP_ENDPOINT_RESERVED_PATH' });
    expect(
      getThrownError((): void =>
        registrar.register({
          method: 'TRACE',
          path: '/trace',
          handler: () => new Response(),
        } as unknown as IHttpEndpoint),
      ),
    ).toMatchObject({ code: 'HTTP_ENDPOINT_INVALID' });
    expect(
      getThrownError((): void =>
        registrar.register({
          method: 'GET',
          path: '/handler',
          handler: undefined,
        } as unknown as IHttpEndpoint),
      ),
    ).toMatchObject({ code: 'HTTP_ENDPOINT_INVALID' });
  });

  it('rolls back a failed owner and releases its route declarations', () => {
    // Arrange
    const registry = new FastifyEndpointRegistry();
    const failedRegistrar = registry.createRegistrar(
      moduleOwner('failed-module'),
    );
    const nextRegistrar = registry.createRegistrar(moduleOwner('next-module'));
    failedRegistrar.register(createEndpoint('GET', '/orders/:id'));
    registry.commit(moduleOwner('failed-module'));

    // Act
    registry.rollback(moduleOwner('failed-module'));
    nextRegistrar.register(createEndpoint('GET', '/orders/:orderId'));

    // Assert
    expect(
      getThrownError((): void =>
        failedRegistrar.register(createEndpoint('GET', '/unreachable')),
      ),
    ).toMatchObject({ code: 'REGISTRATION_SCOPE_CLOSED' });
  });

  it('activates committed module and adapter routes in deterministic order', async () => {
    // Arrange
    const registry = new FastifyEndpointRegistry();
    const betaRegistrar = registry.createRegistrar(moduleOwner('beta-module'));
    const alphaRegistrar = registry.createRegistrar(
      moduleOwner('alpha-module'),
    );
    const skippedRegistrar = registry.createRegistrar(
      moduleOwner('skipped-module'),
    );
    const adminRegistrar = registry.createRegistrar(adminOwner());
    betaRegistrar.register(createEndpoint('GET', '/beta'));
    alphaRegistrar.register(createEndpoint('POST', '/items'));
    alphaRegistrar.register(createEndpoint('GET', '/items'));
    skippedRegistrar.register(createEndpoint('GET', '/skipped'));
    adminRegistrar.register(createEndpoint('GET', '/api/admin/dashboard'));
    registry.commit(moduleOwner('beta-module'));
    registry.commit(moduleOwner('alpha-module'));
    registry.commit(adminOwner());
    const fastify = Fastify({ exposeHeadRoutes: false });
    const activatedRoutes: string[] = [];

    // Act
    registry.activate(fastify, (endpoint) => {
      activatedRoutes.push(`${endpoint.method} ${endpoint.path}`);
      return async (_request, reply) => reply.send(endpoint.path);
    });
    const response = await fastify.inject({ method: 'GET', url: '/items' });

    // Assert
    expect(activatedRoutes).toEqual([
      'GET /api/admin/dashboard',
      'GET /items',
      'POST /items',
      'GET /beta',
    ]);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('/items');
    expect(
      await fastify.inject({ method: 'GET', url: '/skipped' }),
    ).toMatchObject({
      statusCode: 404,
    });
    await fastify.close();
  });

  it('isolates scopes that share an ID but have different owner types', async () => {
    // Arrange
    const registry = new FastifyEndpointRegistry();
    const module = moduleOwner('shared-id');
    const adapter = { type: 'adapter' as const, id: 'shared-id' };
    registry
      .createRegistrar(module)
      .register(createEndpoint('GET', '/module-route'));
    registry
      .createRegistrar(adapter)
      .register(createEndpoint('GET', '/adapter-route'));
    registry.commit(adapter);
    const fastify = Fastify({ exposeHeadRoutes: false });

    // Act
    registry.activate(fastify, (endpoint) => async () => endpoint.path);

    // Assert
    expect(
      await fastify.inject({ method: 'GET', url: '/adapter-route' }),
    ).toMatchObject({ statusCode: 200, body: '/adapter-route' });
    expect(
      await fastify.inject({ method: 'GET', url: '/module-route' }),
    ).toMatchObject({ statusCode: 404 });
    await fastify.close();
  });

  it('seals the collector before route activation and maps Fastify failures', () => {
    // Arrange
    const registry = new FastifyEndpointRegistry();
    const registrar = registry.createRegistrar(moduleOwner('module'));

    registrar.register(createEndpoint('GET', '/items'));
    registry.commit(moduleOwner('module'));

    const fastify = {
      route: (): void => {
        throw new Error('Fastify rejected route.');
      },
    } as unknown as FastifyInstance;

    // Act
    const activate = (): void => {
      registry.activate(fastify, () => async () => undefined);
    };

    // Assert
    const activationError = getThrownError(activate);

    expect(activationError).toBeInstanceOf(FastifyHttpAdapterError);
    expect(activationError).toMatchObject({
      code: 'FASTIFY_HTTP_ADAPTER_ROUTE_ACTIVATION_FAILED',
    });
    expect(
      getThrownError((): void =>
        registrar.register(createEndpoint('GET', '/later')),
      ),
    ).toMatchObject({ code: 'HTTP_ENDPOINT_REGISTRY_SEALED' });
  });

  it('reserves admin and transport namespaces for their owners', () => {
    // Arrange
    const registry = new FastifyEndpointRegistry();
    const moduleRegistrar = registry.createRegistrar(moduleOwner('feature'));
    const adminRegistrar = registry.createRegistrar(adminOwner());

    // Act / Assert
    for (const path of [
      '/api/admin/dashboard',
      '/modules/:moduleId/*',
      '/health',
      '/ready',
    ]) {
      expect(
        getThrownError((): void =>
          moduleRegistrar.register(createEndpoint('GET', path)),
        ),
      ).toMatchObject({ code: 'HTTP_ENDPOINT_RESERVED_PATH' });
    }

    adminRegistrar.register(createEndpoint('GET', '/api/admin/dashboard'));
    adminRegistrar.register(createEndpoint('GET', '/modules/:moduleId/*'));

    expect(
      getThrownError((): void =>
        adminRegistrar.register(createEndpoint('GET', '/health')),
      ),
    ).toMatchObject({ code: 'HTTP_ENDPOINT_RESERVED_PATH' });
  });
});

function createEndpoint(
  method: string,
  path: string,
): IHttpEndpoint & { path: string } {
  return {
    method: method as IHttpEndpoint['method'],
    path,
    handler: () => new Response(),
  };
}

function getThrownError(action: () => void): unknown {
  try {
    action();
  } catch (error: unknown) {
    return error;
  }

  throw new Error('Expected the operation to throw.');
}

function moduleOwner(id: string): IPlatformRuntimeComponentIdentity {
  return { type: 'module', id };
}

function adminOwner(): IPlatformRuntimeComponentIdentity {
  return { type: 'adapter', id: 'platform-admin' };
}
