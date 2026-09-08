import {
  ADMIN_ASSET_CATALOG_SERVICE_TOKEN,
  HOST_RESTART_CAPABILITY_SERVICE_TOKEN,
  HTTP_REQUEST_GATE_SERVICE_TOKEN,
  PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN,
  type IAdminAssetCatalog,
  type IAdminAssetReader,
  type IAdminPluginDescriptor,
  type IHostRestartCapability,
  type IHttpRequestGate,
  type IPlatformRuntimeCatalog,
} from '@/platform/index.js';
import { ADMIN_SHELL_RUNTIME_API_VERSION } from '@/admin/index.js';
import { describe, expect, it } from 'vitest';

describe('administration runtime contracts', () => {
  it('uses globally stable typed administration service tokens', () => {
    expect(Symbol.keyFor(PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN)).toBe(
      'PPS_platform-runtime-catalog',
    );
    expect(Symbol.keyFor(ADMIN_ASSET_CATALOG_SERVICE_TOKEN)).toBe(
      'PPS_admin-asset-catalog',
    );
    expect(Symbol.keyFor(HOST_RESTART_CAPABILITY_SERVICE_TOKEN)).toBe(
      'PPS_host-restart-capability',
    );
    expect(Symbol.keyFor(HTTP_REQUEST_GATE_SERVICE_TOKEN)).toBe(
      'PPS_http-request-gate',
    );
  });

  it('preserves immutable catalog snapshots and opens one-shot asset streams', async () => {
    const snapshot = Object.freeze({
      name: 'Prosto Platform',
      version: '1.0.0',
      modules: Object.freeze([
        Object.freeze({
          id: 'module-test',
          status: 'healthy' as const,
          title: 'Module Test',
          version: '1.0.0',
        }),
      ]),
    });
    const pluginDescriptor = Object.freeze({
      plugin: Object.freeze({
        moduleId: 'module-test',
        moduleVersion: '1.0.0',
        runtimeApiVersion: ADMIN_SHELL_RUNTIME_API_VERSION,
        entry: Object.freeze({
          type: 'script' as const,
          path: '/modules/module-test/admin.js',
        }),
        contentFiles: Object.freeze([]),
      }),
    }) satisfies IAdminPluginDescriptor;
    const runtimeCatalog: IPlatformRuntimeCatalog = {
      getSnapshot: (): typeof snapshot => snapshot,
      getAdminPluginDescriptors: (): readonly IAdminPluginDescriptor[] => [
        pluginDescriptor,
      ],
    };
    const reader: IAdminAssetReader = {
      open: async () => ({
        metadata: {
          contentLength: 2,
          contentType: 'text/css; charset=utf-8',
          etag: '"asset-version"',
        },
        stream: new ReadableStream<Uint8Array>({
          start(controller): void {
            controller.enqueue(new Uint8Array([79, 75]));
            controller.close();
          },
        }),
      }),
    };
    const assetCatalog: IAdminAssetCatalog = {
      resolveAsset: (request) =>
        request.pathname === '/modules/module-test/admin.css' &&
        request.version === 'asset-version'
          ? reader
          : undefined,
    };

    expect(Object.isFrozen(runtimeCatalog.getSnapshot())).toBe(true);
    expect(runtimeCatalog.getAdminPluginDescriptors()).toEqual([
      pluginDescriptor,
    ]);
    expect(
      assetCatalog.resolveAsset({
        pathname: '/modules/module-test/admin.css',
        version: 'asset-version',
      }),
    ).toBe(reader);
    expect(
      assetCatalog.resolveAsset({
        pathname: '/modules/module-test/admin.css',
        version: 'stale',
      }),
    ).toBeUndefined();

    const asset = await reader.open();
    expect(asset.metadata.contentLength).toBe(2);
    expect(
      Array.from(
        new Uint8Array(await new Response(asset.stream).arrayBuffer()),
      ),
    ).toEqual([79, 75]);
  });

  it('models sanitized request-gate decisions and idempotent local restart', async () => {
    const gate: IHttpRequestGate = {
      evaluate: async () => ({
        allowed: false,
        code: 'maintenance',
        status: 503,
      }),
    };
    let restartRequests = 0;
    const restartCapability: IHostRestartCapability = {
      requestGracefulShutdown: async (): Promise<void> => {
        restartRequests ||= 1;
      },
    };

    await expect(
      gate.evaluate({
        method: 'GET',
        pathname: '/api/orders',
        remoteAddress: '127.0.0.1',
      }),
    ).resolves.toEqual({ allowed: false, code: 'maintenance', status: 503 });
    await restartCapability.requestGracefulShutdown();
    await restartCapability.requestGracefulShutdown();
    expect(restartRequests).toBe(1);
  });
});
