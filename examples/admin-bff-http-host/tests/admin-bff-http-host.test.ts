import { createServer } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IAdminBffLogger } from '@prosto/platform-adapter-admin-bff';
import {
  ADMIN_PERMISSION_POLICY_SCHEMA_VERSION,
  ADMIN_UI_PLUGIN_MANIFEST_SCHEMA_VERSION,
  type IAdminPermissionPolicy,
  type IAdminUIPluginManifest,
} from '@prosto/platform-admin-contracts';
import { PlatformDelegatedIdentity } from '@prosto/platform-sdk';
import { PlatformAdminBffRuntimeHost } from '@/index.js';

const permissionPolicy: IAdminPermissionPolicy = {
  schemaVersion: ADMIN_PERMISSION_POLICY_SCHEMA_VERSION,
  roleMappings: [{ roleId: 'admin', permissions: ['catalog.read'] }],
  actionGates: [
    {
      actionId: 'publish',
      requiredPermissions: ['catalog.read'],
      match: 'all',
      effect: 'allow',
    },
  ],
};

const manifest: IAdminUIPluginManifest = {
  schemaVersion: ADMIN_UI_PLUGIN_MANIFEST_SCHEMA_VERSION,
  id: 'catalog-admin-ui',
  version: '1.0.0',
  displayName: 'Catalog Admin UI',
  shellCompatibility: '>=1.0.0',
  requiredPermissions: ['catalog.read'],
  requiredCapabilities: ['catalog'],
  extensionPoints: ['nav'],
  trustClass: 'trusted',
  reviewStatus: 'approved',
  metadata: { owner: 'platform' },
};

async function findAvailablePort(): Promise<number> {
  const listener = createServer();
  await new Promise<void>((resolve, reject): void => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const address = listener.address();

  if (!address || typeof address === 'string') {
    throw new Error('Could not allocate a TCP port for the test.');
  }

  await new Promise<void>((resolve, reject): void => {
    listener.close((error): void => (error ? reject(error) : resolve()));
  });

  return address.port;
}

function createLogger(): IAdminBffLogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('RuntimeBuilder Admin BFF HTTP composition root', (): void => {
  const hosts: { stop(): Promise<void> }[] = [];

  afterEach(async (): Promise<void> => {
    await Promise.all(hosts.splice(0).map((host) => host.stop()));
  });

  it('starts RuntimeBuilder before Fastify and serves BFF plus runtime diagnostics', async (): Promise<void> => {
    // Arrange
    const port = await findAvailablePort();
    const fetchUIPluginManifests = vi.fn(async () => [manifest]);
    const resolver = vi.fn(async (request) =>
      request.path === '/admin/api/v1/health' &&
      request.headers['x-delegated-request']?.[0] !== 'true'
        ? {
            authenticationType: 'anonymous' as const,
            roles: [],
            permissions: [],
          }
        : new PlatformDelegatedIdentity({
            subjectId: 'operator-42',
            roles: ['admin'],
            permissions: [],
          }),
    );
    const host = PlatformAdminBffRuntimeHost.create({
      http: {
        host: '127.0.0.1',
        port,
        identityResolver: { resolve: resolver },
      },
      runtime: { environment: 'test', commandLineArgs: [] },
      adminBff: {
        catalogSource: { fetchUIPluginManifests },
        permissionPolicy,
        shellVersion: '1.0.0',
        environment: 'test',
        discoveryPipelineVersion: 'example.v1',
        logger: createLogger(),
      },
    });
    hosts.push(host);

    // Act
    await host.start();
    const [
      discovery,
      action,
      adminHealth,
      diagnostics,
      health,
      readiness,
      anonymous,
    ] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/admin/api/v1/discovery`, {
        headers: { 'x-correlation-id': 'discovery-42' },
      }),
      fetch(`http://127.0.0.1:${port}/admin/api/v1/action/publish`, {
        method: 'POST',
      }),
      fetch(`http://127.0.0.1:${port}/admin/api/v1/health`, {
        headers: { 'x-delegated-request': 'true' },
      }),
      fetch(`http://127.0.0.1:${port}/admin/api/v1/diagnostics`),
      fetch(`http://127.0.0.1:${port}/platform/health`),
      fetch(`http://127.0.0.1:${port}/platform/ready`),
      fetch(`http://127.0.0.1:${port}/admin/api/v1/health`),
    ]);

    // Assert
    expect(host.runtime.started).toBe(true);
    expect(discovery.status).toBe(200);
    expect(discovery.headers.get('x-correlation-id')).toBe('discovery-42');
    expect((await discovery.json()).data.plugins).toHaveLength(1);
    expect(action.status).toBe(200);
    expect((await action.json()).data.actionId).toBe('publish');
    expect(adminHealth.status).toBe(200);
    expect(diagnostics.status).toBe(200);
    expect(health.status).toBe(200);
    expect(readiness.status).toBe(200);
    expect(anonymous.status).toBe(401);
    expect((await anonymous.json()).error.code).toBe('UNAUTHENTICATED');
    expect(fetchUIPluginManifests).toHaveBeenCalledTimes(3);

    await host.stop();
    expect(host.runtime.stopped).toBe(true);
  });
});
