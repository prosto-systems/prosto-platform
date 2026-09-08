import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it } from 'vitest';
import {
  HttpEndpointRegistrationError,
  type IHttpEndpoint,
} from '@prosto/platform-sdk/platform';
import { FastifyHttpApplicationError } from '../src/errors/index.js';
import { FastifyEndpointRegistry } from '../src/registries/fastify-endpoint.registry.js';

describe('FastifyEndpointRegistry', () => {
  it('copies declarations and rejects canonical route conflicts', () => {
    // Arrange
    const registry = new FastifyEndpointRegistry();
    const firstRegistrar = registry.createRegistrar('first-module');
    const secondRegistrar = registry.createRegistrar('second-module');
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
    const registrar = registry.createRegistrar('module');
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
    const failedRegistrar = registry.createRegistrar('failed-module');
    const nextRegistrar = registry.createRegistrar('next-module');
    failedRegistrar.register(createEndpoint('GET', '/orders/:id'));
    registry.commit('failed-module');

    // Act
    registry.rollback('failed-module');
    nextRegistrar.register(createEndpoint('GET', '/orders/:orderId'));

    // Assert
    expect(
      getThrownError((): void =>
        failedRegistrar.register(createEndpoint('GET', '/unreachable')),
      ),
    ).toMatchObject({ code: 'REGISTRATION_SCOPE_CLOSED' });
  });

  it('activates only committed routes from started modules in deterministic order', async () => {
    // Arrange
    const registry = new FastifyEndpointRegistry();
    const betaRegistrar = registry.createRegistrar('beta-module');
    const alphaRegistrar = registry.createRegistrar('alpha-module');
    const skippedRegistrar = registry.createRegistrar('skipped-module');
    betaRegistrar.register(createEndpoint('GET', '/beta'));
    alphaRegistrar.register(createEndpoint('POST', '/items'));
    alphaRegistrar.register(createEndpoint('GET', '/items'));
    skippedRegistrar.register(createEndpoint('GET', '/skipped'));
    registry.commit('beta-module');
    registry.commit('alpha-module');
    registry.commit('skipped-module');
    const fastify = Fastify({ exposeHeadRoutes: false });
    const activatedRoutes: string[] = [];

    // Act
    registry.activate(
      fastify,
      new Set(['beta-module', 'alpha-module']),
      (endpoint) => {
        activatedRoutes.push(`${endpoint.method} ${endpoint.path}`);
        return async (_request, reply) => reply.send(endpoint.path);
      },
    );
    const response = await fastify.inject({ method: 'GET', url: '/items' });

    // Assert
    expect(activatedRoutes).toEqual(['GET /items', 'POST /items', 'GET /beta']);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('/items');
    expect(
      await fastify.inject({ method: 'GET', url: '/skipped' }),
    ).toMatchObject({
      statusCode: 404,
    });
    await fastify.close();
  });

  it('seals the collector before route activation and maps Fastify failures', () => {
    // Arrange
    const registry = new FastifyEndpointRegistry();
    const registrar = registry.createRegistrar('module');

    registrar.register(createEndpoint('GET', '/items'));
    registry.commit('module');

    const fastify = {
      route: (): void => {
        throw new Error('Fastify rejected route.');
      },
    } as unknown as FastifyInstance;

    // Act
    const activate = (): void => {
      registry.activate(
        fastify,
        new Set(['module']),
        () => async () => undefined,
      );
    };

    // Assert
    const activationError = getThrownError(activate);

    expect(activationError).toBeInstanceOf(FastifyHttpApplicationError);
    expect(activationError).toMatchObject({
      code: 'FASTIFY_HTTP_APPLICATION_ROUTE_ACTIVATION_FAILED',
    });
    expect(
      getThrownError((): void =>
        registrar.register(createEndpoint('GET', '/later')),
      ),
    ).toMatchObject({ code: 'HTTP_ENDPOINT_REGISTRY_SEALED' });
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
