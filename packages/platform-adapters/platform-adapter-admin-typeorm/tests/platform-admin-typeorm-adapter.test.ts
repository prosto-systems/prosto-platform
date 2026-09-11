import {
  HTTP_REQUEST_GATE_SERVICE_TOKEN,
  type IHttpEndpoint,
  type IHttpEndpointRegistrar,
  type IHttpRequestGateInput,
  type IPersistenceDescriptor,
  type IPersistenceDescriptorRegistrar,
  type IPlatformRuntimeAdapterInitializationContext,
  type IPlatformRuntimeAdapterStartContext,
  type IPlatformRuntimeAdapterStopContext,
  type IPlatformRuntimeScopedServiceRegistrar,
  type ServiceTokenType,
} from '@prosto/platform-sdk/platform';
import { TYPEORM_DATA_SOURCE_SERVICE_TOKEN } from '@prosto/platform-adapter-typeorm';
import { afterEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import {
  AdminActivityEntity,
  AdminMailOutboxEntity,
  AdminPasswordResetEntity,
  AdminRateLimitAttemptEntity,
  AdminSessionEntity,
  AdminStateEntity,
  AdminUserEntity,
} from '@/entities/index.js';
import {
  PlatformAdminTypeOrmAdapter,
  type PlatformAdminTypeOrmAdapterOptionsType,
} from '@/index.js';

const dataSources: DataSource[] = [];

class TestServices implements IPlatformRuntimeScopedServiceRegistrar {
  private readonly _values = new Map<symbol, unknown>();

  has<TService>(token: ServiceTokenType<TService>): boolean {
    return this._values.has(token);
  }

  register<TService>(
    token: ServiceTokenType<TService>,
    service: NoInfer<TService>,
  ): void {
    if (this._values.has(token)) {
      throw new Error('Test service is already registered.');
    }

    this._values.set(token, service);
  }

  resolve<TService>(token: ServiceTokenType<TService>): TService | undefined {
    return this._values.get(token) as TService | undefined;
  }

  resolveRequired<TService>(token: ServiceTokenType<TService>): TService {
    const service = this.resolve(token);

    if (service === undefined) {
      throw new Error('Required test service is unavailable.');
    }

    return service;
  }

  unregister<TService>(token: ServiceTokenType<TService>): void {
    this._values.delete(token);
  }
}

class TestDescriptorRegistrar implements IPersistenceDescriptorRegistrar {
  readonly descriptors: IPersistenceDescriptor[] = [];

  register(descriptor: IPersistenceDescriptor): void {
    this.descriptors.push(descriptor);
  }
}

class TestEndpointRegistrar implements IHttpEndpointRegistrar {
  readonly endpoints: IHttpEndpoint[] = [];

  register(endpoint: IHttpEndpoint): void {
    this.endpoints.push(endpoint);
  }
}

function configuration(
  withBootstrap = false,
): PlatformAdminTypeOrmAdapterOptionsType {
  return {
    allowedPublicOrigin: 'https://admin.example.test',
    ...(withBootstrap
      ? {
          bootstrap: {
            displayName: 'Platform Admin',
            email: 'admin@example.test',
            password: 'a-secure-bootstrap-password',
          },
        }
      : {}),
    cookie: { lifetimeSeconds: 3_600, name: 'admin_session', secure: true },
    outbox: { leaseSeconds: 30, maxAttempts: 3, retryBaseSeconds: 1 },
    rateLimit: {
      login: { maxAttempts: 5, windowSeconds: 60 },
      passwordReset: { maxAttempts: 5, windowSeconds: 60 },
    },
    resetTokenEncryptionKey: Buffer.alloc(32).toString('base64url'),
    resetUrlBase: 'https://admin.example.test/password-reset',
    restartPollingIntervalSeconds: 60,
    smtp: {
      from: 'noreply@example.test',
      host: 'smtp.example.test',
      port: 465,
      secure: true,
    },
    trustedIngressConfigured: true,
  };
}

function initializationContext(input: {
  readonly configuration?: Readonly<Record<string, unknown>>;
  readonly descriptors?: TestDescriptorRegistrar;
  readonly endpoints?: TestEndpointRegistrar;
  readonly environment?: string;
  readonly services?: TestServices;
}): IPlatformRuntimeAdapterInitializationContext {
  return {
    config: input.configuration ?? configuration(),
    contributions: {
      http: input.endpoints ?? new TestEndpointRegistrar(),
      persistence: input.descriptors ?? new TestDescriptorRegistrar(),
      services: input.services ?? new TestServices(),
    },
    environment: input.environment ?? 'test',
    identity: { id: 'platform-admin', type: 'adapter' },
    logger: {
      debug: (): void => undefined,
      error: (): void => undefined,
      info: (): void => undefined,
      warn: (): void => undefined,
    },
  };
}

function lifecycleContext(): IPlatformRuntimeAdapterStartContext &
  IPlatformRuntimeAdapterStopContext {
  return {
    config: configuration(),
    environment: 'test',
    identity: { id: 'platform-admin', type: 'adapter' },
    logger: {
      debug: (): void => undefined,
      error: (): void => undefined,
      info: (): void => undefined,
      warn: (): void => undefined,
    },
    runtime: {
      degraded: false,
      started: false,
      startedModuleIds: ['module-test'],
      stopped: false,
      stopping: false,
    },
  };
}

function requestGateInput(pathname: string): IHttpRequestGateInput {
  return { method: 'GET', pathname, remoteAddress: '192.0.2.1' };
}

afterEach(async () => {
  await Promise.all(
    dataSources.splice(0).map(async (dataSource) => dataSource.destroy()),
  );
});

describe('PlatformAdminTypeOrmAdapter', () => {
  it('exposes the public admin adapter identity', () => {
    const adapter = new PlatformAdminTypeOrmAdapter();

    expect(adapter.id).toBe('platform-admin');
    expect(adapter.role).toBe('admin');
  });

  it('validates scoped configuration before registering contributions', () => {
    const adapter = new PlatformAdminTypeOrmAdapter();
    const descriptors = new TestDescriptorRegistrar();
    const endpoints = new TestEndpointRegistrar();
    const services = new TestServices();

    expect(() =>
      adapter.initialize(
        initializationContext({
          configuration: {},
          descriptors,
          endpoints,
          services,
        }),
      ),
    ).toThrow();
    expect(descriptors.descriptors).toEqual([]);
    expect(endpoints.endpoints).toEqual([]);
    expect(services.has(HTTP_REQUEST_GATE_SERVICE_TOKEN)).toBe(false);
  });

  it('owns TypeORM, request-gate, and HTTP declarations as an adapter', () => {
    const adapter = new PlatformAdminTypeOrmAdapter();
    const descriptors = new TestDescriptorRegistrar();
    const endpoints = new TestEndpointRegistrar();
    const services = new TestServices();

    adapter.initialize(
      initializationContext({ descriptors, endpoints, services }),
    );

    expect(descriptors.descriptors).toHaveLength(1);
    expect(descriptors.descriptors[0]).toMatchObject({
      owner: 'adapter',
      ownerId: 'platform-admin',
    });
    expect(endpoints.endpoints).not.toHaveLength(0);
    expect(services.has(HTTP_REQUEST_GATE_SERVICE_TOKEN)).toBe(true);
  });

  it('requires the production restart capability before contributions', () => {
    const adapter = new PlatformAdminTypeOrmAdapter();
    const descriptors = new TestDescriptorRegistrar();
    const endpoints = new TestEndpointRegistrar();
    const services = new TestServices();

    expect(() =>
      adapter.initialize(
        initializationContext({
          descriptors,
          endpoints,
          environment: 'production',
          services,
        }),
      ),
    ).toThrow(/restart capability/i);
    expect(descriptors.descriptors).toEqual([]);
    expect(endpoints.endpoints).toEqual([]);
    expect(services.has(HTTP_REQUEST_GATE_SERVICE_TOKEN)).toBe(false);
  });

  it('cleans bindings after a start failure without removing orchestrator-owned services', async () => {
    const adapter = new PlatformAdminTypeOrmAdapter();
    const services = new TestServices();

    adapter.initialize(initializationContext({ services }));

    await expect(adapter.start(lifecycleContext())).rejects.toThrow(
      /Required test service is unavailable/,
    );
    await expect(
      services.resolveRequired(HTTP_REQUEST_GATE_SERVICE_TOKEN).evaluate({
        ...requestGateInput('/orders'),
      }),
    ).rejects.toThrow(/not ready/i);
    expect(services.has(HTTP_REQUEST_GATE_SERVICE_TOKEN)).toBe(true);
  });

  it('uses the ready TypeORM service to bootstrap and gracefully stop workers', async () => {
    const dataSource = new DataSource({
      database: ':memory:',
      entities: [
        AdminActivityEntity,
        AdminMailOutboxEntity,
        AdminPasswordResetEntity,
        AdminRateLimitAttemptEntity,
        AdminSessionEntity,
        AdminStateEntity,
        AdminUserEntity,
      ],
      synchronize: true,
      type: 'better-sqlite3',
    });
    dataSources.push(dataSource);
    await dataSource.initialize();

    const adapter = new PlatformAdminTypeOrmAdapter();
    const services = new TestServices();
    services.register(TYPEORM_DATA_SOURCE_SERVICE_TOKEN, dataSource);
    adapter.initialize(
      initializationContext({
        configuration: configuration(true),
        services,
      }),
    );

    await adapter.start(lifecycleContext());

    expect(await dataSource.getRepository(AdminUserEntity).count()).toBe(1);

    await adapter.stop(lifecycleContext());

    await expect(
      services.resolveRequired(HTTP_REQUEST_GATE_SERVICE_TOKEN).evaluate({
        ...requestGateInput('/orders'),
      }),
    ).rejects.toThrow(/not ready/i);
  });
});
