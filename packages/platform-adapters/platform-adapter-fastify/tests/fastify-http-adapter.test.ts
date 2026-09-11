import {
  HTTP_REQUEST_GATE_SERVICE_TOKEN,
  type IHttpRequestGate,
  type IPlatformRuntimeAdapterInitializationContext,
  type IPlatformRuntimeAdapterStartContext,
  type IPlatformRuntimeAdapterStopContext,
  type IPlatformRuntimeLifecycleView,
  type ServiceTokenType,
} from '@prosto/platform-sdk/platform';
import { describe, expect, it, vi } from 'vitest';
import { FastifyHttpAdapter, FastifyHttpAdapterError } from '../src/index.js';

describe('FastifyHttpAdapter lifecycle', () => {
  it('rejects invalid configuration before transport initialization', () => {
    // Arrange / Act
    const createAdapter = (): FastifyHttpAdapter =>
      new FastifyHttpAdapter({ port: -1 });

    // Assert
    expect(createAdapter).toThrow(FastifyHttpAdapterError);
  });

  it('listens only in the transport barrier and does not own runtime lifecycle', async () => {
    // Arrange
    const adapter = new FastifyHttpAdapter({ host: '127.0.0.1', port: 0 });
    const runtime = createRuntimeView();
    const owner = { type: 'module' as const, id: 'orders' };
    const handler = vi.fn(() => Response.json({ orders: [] }));
    adapter.endpoints.createRegistrar(owner).register({
      method: 'GET',
      path: '/api/orders',
      handler,
    });
    adapter.endpoints.commit(owner);

    // Act
    await adapter.initialize(createInitializationContext());
    expect(adapter.url).toBeUndefined();
    await adapter.start(createStartContext(runtime));
    const unavailableResponse = await fetch(
      new URL('/api/orders', adapter.url),
    );
    const readinessResponse = await fetch(new URL('/ready', adapter.url));
    runtime.started = true;
    const endpointResponse = await fetch(new URL('/api/orders', adapter.url));

    // Assert
    expect(adapter.state).toBe('listening');
    expect(unavailableResponse.status).toBe(503);
    expect(await unavailableResponse.json()).toMatchObject({
      code: 'runtime_not_ready',
    });
    expect(readinessResponse.status).toBe(503);
    expect(await readinessResponse.json()).toMatchObject({
      ready: false,
      startedModuleIds: [],
    });
    expect(endpointResponse.status).toBe(200);
    expect(await endpointResponse.json()).toEqual({ orders: [] });
    expect(handler).toHaveBeenCalledOnce();

    await adapter.stop(createStopContext(runtime));
    expect(adapter.state).toBe('stopped');
  });

  it('activates only committed adapter-owned routes', async () => {
    // Arrange
    const adapter = new FastifyHttpAdapter({ port: 0 });
    const runtime = createRuntimeView({ started: true });
    const committedOwner = { type: 'adapter' as const, id: 'platform-admin' };
    const skippedOwner = { type: 'module' as const, id: 'skipped' };
    adapter.endpoints.createRegistrar(committedOwner).register({
      method: 'GET',
      path: '/api/admin/dashboard',
      handler: () => Response.json({ ready: true }),
    });
    adapter.endpoints.createRegistrar(skippedOwner).register({
      method: 'GET',
      path: '/api/skipped',
      handler: () => Response.json({ unreachable: true }),
    });
    adapter.endpoints.commit(committedOwner);

    // Act
    await adapter.initialize(createInitializationContext());
    await adapter.start(createStartContext(runtime));
    const adapterResponse = await fetch(
      new URL('/api/admin/dashboard', adapter.url),
    );
    const skippedResponse = await fetch(new URL('/api/skipped', adapter.url));

    // Assert
    expect(adapterResponse.status).toBe(200);
    expect(await adapterResponse.json()).toEqual({ ready: true });
    expect(skippedResponse.status).toBe(404);

    await adapter.stop(createStopContext(runtime));
  });

  it('resolves the request gate only after the admin barrier', async () => {
    // Arrange
    const requestGate: IHttpRequestGate = {
      evaluate: vi.fn(async () => ({
        allowed: false as const,
        status: 503 as const,
        code: 'maintenance',
      })),
    };
    const adapter = new FastifyHttpAdapter({ port: 0 });
    const runtime = createRuntimeView({ started: true });
    const owner = { type: 'module' as const, id: 'orders' };
    const handler = vi.fn(() => Response.json({ unreachable: true }));
    adapter.endpoints.createRegistrar(owner).register({
      method: 'POST',
      path: '/api/orders',
      handler,
    });
    adapter.endpoints.commit(owner);

    // Act
    await adapter.initialize(createInitializationContext(requestGate));
    await adapter.start(createStartContext(runtime));
    const response = await fetch(new URL('/api/orders', adapter.url), {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: 'unread body',
    });

    // Assert
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'maintenance' });
    expect(handler).not.toHaveBeenCalled();
    expect(requestGate.evaluate).toHaveBeenCalledOnce();

    await adapter.stop(createStopContext(runtime));
  });

  it('closes a partially started transport after listen failure', async () => {
    // Arrange
    const firstAdapter = new FastifyHttpAdapter({ host: '127.0.0.1', port: 0 });
    const runtime = createRuntimeView({ started: true });
    await firstAdapter.initialize(createInitializationContext());
    await firstAdapter.start(createStartContext(runtime));
    const port = firstAdapter.url?.port;
    const secondAdapter = new FastifyHttpAdapter({
      host: '127.0.0.1',
      port: Number(port),
    });

    // Act
    await secondAdapter.initialize(createInitializationContext());
    const start = secondAdapter.start(createStartContext(runtime));

    // Assert
    await expect(start).rejects.toMatchObject({
      code: 'FASTIFY_HTTP_ADAPTER_LISTEN_FAILED',
    });
    expect(secondAdapter.state).toBe('failed');

    await firstAdapter.stop(createStopContext(runtime));
  });
});

function createRuntimeView(
  values: Partial<IPlatformRuntimeLifecycleView> = {},
): IPlatformRuntimeLifecycleView & { started: boolean } {
  return {
    started: false,
    stopping: false,
    stopped: false,
    degraded: false,
    startedModuleIds: [],
    ...values,
  };
}

function createInitializationContext(
  requestGate?: IHttpRequestGate,
): IPlatformRuntimeAdapterInitializationContext {
  return {
    identity: { type: 'adapter', id: 'fastify' },
    environment: 'test',
    config: {},
    logger: createLogger(),
    contributions: {
      services: {
        register: (): void => undefined,
        unregister: (): void => undefined,
        resolve: <TService>(
          token: ServiceTokenType<TService>,
        ): TService | undefined =>
          token === HTTP_REQUEST_GATE_SERVICE_TOKEN
            ? (requestGate as TService | undefined)
            : undefined,
        resolveRequired: <TService>(
          _token: ServiceTokenType<TService>,
        ): TService => {
          throw new Error('No test services are registered.');
        },
        has: (): boolean => false,
      },
    },
  };
}

function createStartContext(
  runtime: IPlatformRuntimeLifecycleView,
): IPlatformRuntimeAdapterStartContext {
  return {
    identity: { type: 'adapter', id: 'fastify' },
    environment: 'test',
    config: {},
    logger: createLogger(),
    runtime,
  };
}

function createStopContext(
  runtime: IPlatformRuntimeLifecycleView,
): IPlatformRuntimeAdapterStopContext {
  return { ...createStartContext(runtime), runtime };
}

function createLogger(): IPlatformRuntimeAdapterInitializationContext['logger'] {
  return {
    debug: (): void => undefined,
    info: (): void => undefined,
    warn: (): void => undefined,
    error: (): void => undefined,
  };
}
