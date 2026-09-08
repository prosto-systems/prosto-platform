import type {
  IAdminAssetCatalog,
  IAdminAssetReader,
  IAdminPluginDescriptor,
  IPlatformRuntimeCatalog,
  IPlatformRuntimeSnapshot,
  IServiceRegistry,
  ServiceTokenType,
  IHttpRequestContext,
} from '@prosto/platform-sdk/platform';
import {
  ADMIN_ASSET_CATALOG_SERVICE_TOKEN,
  PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN,
} from '@prosto/platform-sdk/platform';
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
import { AdminEndpoints, PasswordHasher } from '@/services/index.js';

const dataSources: DataSource[] = [];

class TestServiceRegistry implements IServiceRegistry {
  private readonly _services = new Map<symbol, unknown>();

  has<TService>(token: ServiceTokenType<TService>): boolean {
    return this._services.has(token);
  }

  register<TService>(
    token: ServiceTokenType<TService>,
    service: NoInfer<TService>,
  ): void {
    this._services.set(token, service);
  }

  override<TService>(
    token: ServiceTokenType<TService>,
    service: NoInfer<TService>,
  ): void {
    this._services.set(token, service);
  }

  resolve<TService>(token: ServiceTokenType<TService>): TService | undefined {
    return this._services.get(token) as TService | undefined;
  }

  resolveRequired<TService>(token: ServiceTokenType<TService>): TService {
    const service = this.resolve(token);

    if (service === undefined) {
      throw new Error('Required test service is absent.');
    }

    return service;
  }

  unregister<TService>(token: ServiceTokenType<TService>): void {
    this._services.delete(token);
  }
}

const runtimeSnapshot: IPlatformRuntimeSnapshot = {
  name: 'Prosto',
  version: '1.0.0',
  modules: [
    {
      id: 'platform-admin',
      status: 'healthy',
      title: 'Administration',
      version: '1.0.0',
    },
  ],
};

const pluginDescriptors: readonly IAdminPluginDescriptor[] = [
  {
    plugin: {
      contentFiles: [],
      entry: {
        hash: 'entry-hash',
        path: '/modules/module-test/dist/admin/admin.plugin.js',
        type: 'script',
      },
      moduleId: 'module-test',
      moduleVersion: '1.0.0',
      runtimeApiVersion: 1,
    },
  },
];

const runtimeCatalog: IPlatformRuntimeCatalog = {
  getAdminPluginDescriptors: (): readonly IAdminPluginDescriptor[] =>
    pluginDescriptors,
  getSnapshot: (): IPlatformRuntimeSnapshot => runtimeSnapshot,
};

const assetCatalog: IAdminAssetCatalog = {
  resolveAsset: ({ pathname, version }): IAdminAssetReader | undefined => {
    if (
      pathname !== '/modules/module-test/dist/admin/admin.plugin.js' ||
      version !== 'entry-hash'
    ) {
      return undefined;
    }

    return {
      open: async () => ({
        metadata: {
          contentLength: 14,
          contentType: 'text/javascript',
          etag: '"entry-hash"',
        },
        stream: new ReadableStream({
          start(controller): void {
            controller.enqueue(new TextEncoder().encode('export default;'));
            controller.close();
          },
        }),
      }),
    };
  },
};

afterEach(async () => {
  await Promise.all(
    dataSources.splice(0).map((dataSource) => dataSource.destroy()),
  );
});

async function createEndpoints(): Promise<AdminEndpoints> {
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

  const now = new Date().toISOString();

  await dataSource.getRepository(AdminStateEntity).insert({
    id: 'platform-admin-state',
    maintenanceEnabled: false,
    restartGeneration: 0,
    updatedAt: now,
  });
  await dataSource.getRepository(AdminUserEntity).insert({
    displayName: 'Platform Admin',
    email: 'admin@example.test',
    id: 'admin-1',
    normalizedEmail: 'admin@example.test',
    passwordHash: await new PasswordHasher().hash('correct-password'),
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  });

  const services = new TestServiceRegistry();

  services.register(PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN, runtimeCatalog);
  services.register(ADMIN_ASSET_CATALOG_SERVICE_TOKEN, assetCatalog);

  const endpoints = new AdminEndpoints(
    {
      allowedPublicOrigin: 'https://admin.example.test',
      cookie: { lifetimeSeconds: 3600, name: 'admin_session', secure: true },
      outbox: { leaseSeconds: 30, maxAttempts: 3, retryBaseSeconds: 1 },
      rateLimit: {
        login: { maxAttempts: 20, windowSeconds: 60 },
        passwordReset: { maxAttempts: 20, windowSeconds: 60 },
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
    },
    services,
  );

  endpoints.bind(dataSource);

  return endpoints;
}

function context(input: {
  readonly body?: unknown;
  readonly correlationId?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly method: IHttpRequestContext['method'];
  readonly path: string;
}): IHttpRequestContext {
  return {
    body:
      input.body === undefined
        ? { kind: 'none' }
        : { kind: 'json', value: input.body },
    correlationId: input.correlationId ?? 'test-correlation-id',
    headers: input.headers ?? {},
    host: 'admin.example.test',
    method: input.method,
    params: {},
    protocol: 'https',
    query: {},
    remoteAddress: '192.0.2.1',
    signal: new AbortController().signal,
    url: new URL(`https://admin.example.test${input.path}`),
  };
}

async function call(
  endpoints: AdminEndpoints,
  method: IHttpRequestContext['method'],
  path: string,
  headers?: Readonly<Record<string, string>>,
  body?: unknown,
): Promise<Response> {
  const endpoint = endpoints.endpoints.find(
    (candidate) => candidate.method === method && candidate.path === path,
  );

  if (!endpoint) {
    throw new Error(`Endpoint ${method} ${path} is not registered.`);
  }

  return endpoint.handler(context({ body, headers, method, path }));
}

describe('AdminEndpoints', () => {
  it('registers the production endpoint set without module restart', async () => {
    const endpoints = await createEndpoints();

    expect(endpoints.endpoints).toHaveLength(14);
    expect(
      endpoints.endpoints.some(
        (endpoint) => endpoint.path === '/api/admin/modules/:moduleId/restart',
      ),
    ).toBe(false);
  });

  it('authenticates, rotates CSRF, protects operations, and serves declared assets', async () => {
    const endpoints = await createEndpoints();
    const login = await call(
      endpoints,
      'POST',
      '/api/admin/auth/login',
      { origin: 'https://admin.example.test' },
      { email: 'ADMIN@example.test', password: 'correct-password' },
    );

    expect(login.status).toBe(200);

    const loginSession = (await login.json()) as { csrfToken: string };
    const cookie = login.headers.get('set-cookie');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Secure');

    const session = await call(endpoints, 'GET', '/api/admin/auth/session', {
      cookie: cookie ?? '',
    });
    const reloadedSession = (await session.json()) as { csrfToken: string };
    expect(reloadedSession.csrfToken).not.toBe(loginSession.csrfToken);

    const missingCsrf = await call(
      endpoints,
      'PATCH',
      '/api/admin/platform/maintenance',
      { cookie: cookie ?? '', origin: 'https://admin.example.test' },
      { enabled: true },
    );
    expect(missingCsrf.status).toBe(403);

    const maintenance = await call(
      endpoints,
      'PATCH',
      '/api/admin/platform/maintenance',
      {
        cookie: cookie ?? '',
        origin: 'https://admin.example.test',
        'x-csrf-token': reloadedSession.csrfToken,
      },
      { enabled: true },
    );
    expect(await maintenance.json()).toEqual({ enabled: true });

    const dashboard = await call(endpoints, 'GET', '/api/admin/dashboard', {
      cookie: cookie ?? '',
    });
    expect(await dashboard.json()).toMatchObject({ maintenanceEnabled: true });

    const health = await call(endpoints, 'GET', '/api/admin/platform/health', {
      cookie: cookie ?? '',
    });
    expect(await health.json()).toMatchObject({ status: 'maintenance' });

    const modules = await call(endpoints, 'GET', '/api/admin/modules', {
      cookie: cookie ?? '',
    });
    expect(await modules.json()).toMatchObject([{ id: 'platform-admin' }]);

    const activity = await call(endpoints, 'GET', '/api/admin/activity', {
      cookie: cookie ?? '',
    });
    expect((await activity.json()) as unknown[]).not.toHaveLength(0);

    const restart = await call(
      endpoints,
      'POST',
      '/api/admin/platform/restart',
      {
        cookie: cookie ?? '',
        origin: 'https://admin.example.test',
        'x-csrf-token': reloadedSession.csrfToken,
      },
    );
    expect(restart.status).toBe(202);

    const manifest = await call(
      endpoints,
      'GET',
      '/api/admin/platform/manifest',
      { cookie: cookie ?? '' },
    );
    expect(manifest.headers.get('cache-control')).toBe('private, no-cache');
    expect((await manifest.json()) as { plugins: unknown[] }).toMatchObject({
      plugins: [{ moduleId: 'module-test' }],
    });

    const asset = await call(endpoints, 'GET', '/modules/:moduleId/*', {
      cookie: cookie ?? '',
    });
    expect(asset.status).toBe(404);

    const assetEndpoint = endpoints.endpoints.find(
      (endpoint) =>
        endpoint.method === 'GET' && endpoint.path === '/modules/:moduleId/*',
    );
    const declaredAsset = await assetEndpoint?.handler(
      context({
        headers: { cookie: cookie ?? '' },
        method: 'GET',
        path: '/modules/module-test/dist/admin/admin.plugin.js?v=entry-hash',
      }),
    );
    expect(declaredAsset?.headers.get('cache-control')).toBe(
      'private, max-age=31536000, immutable',
    );
    expect(await declaredAsset?.text()).toBe('export default;');

    const headAssetEndpoint = endpoints.endpoints.find(
      (endpoint) =>
        endpoint.method === 'HEAD' && endpoint.path === '/modules/:moduleId/*',
    );
    const headAsset = await headAssetEndpoint?.handler(
      context({
        headers: { cookie: cookie ?? '' },
        method: 'HEAD',
        path: '/modules/module-test/dist/admin/admin.plugin.js?v=entry-hash',
      }),
    );
    expect(headAsset?.headers.get('content-length')).toBe('14');

    const logout = await call(endpoints, 'POST', '/api/admin/auth/logout', {
      cookie: cookie ?? '',
      origin: 'https://admin.example.test',
      'x-csrf-token': reloadedSession.csrfToken,
    });
    expect(logout.status).toBe(204);
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('keeps password-reset responses neutral and queues mail only for known users', async () => {
    const endpoints = await createEndpoints();
    const headers = { origin: 'https://admin.example.test' };
    const known = await call(
      endpoints,
      'POST',
      '/api/admin/auth/password-reset-requests',
      headers,
      { email: 'admin@example.test' },
    );
    const unknown = await call(
      endpoints,
      'POST',
      '/api/admin/auth/password-reset-requests',
      headers,
      { email: 'unknown@example.test' },
    );

    expect(known.status).toBe(202);
    expect(await known.json()).toEqual(await unknown.json());
  });
});
