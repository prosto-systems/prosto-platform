import type {
  IAdminAssetCatalog,
  IHostRestartCapability,
  IHttpRequestContext,
  IHttpRequestGate,
  IPlatformRuntimeCatalog,
  IServiceRegistry,
} from '@/platform/index.js';
import {
  ADMIN_ASSET_CATALOG_SERVICE_TOKEN,
  HOST_RESTART_CAPABILITY_SERVICE_TOKEN,
  HTTP_REQUEST_GATE_SERVICE_TOKEN,
  PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN,
} from '@/platform/index.js';

declare const services: IServiceRegistry;
declare const context: IHttpRequestContext;

const runtimeCatalog: IPlatformRuntimeCatalog = services.resolveRequired(
  PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN,
);
const assetCatalog: IAdminAssetCatalog = services.resolveRequired(
  ADMIN_ASSET_CATALOG_SERVICE_TOKEN,
);
const requestGate: IHttpRequestGate | undefined = services.resolve(
  HTTP_REQUEST_GATE_SERVICE_TOKEN,
);
const restartCapability: IHostRestartCapability | undefined = services.resolve(
  HOST_RESTART_CAPABILITY_SERVICE_TOKEN,
);

const protocol: 'http' | 'https' = context.protocol;
const host: string = context.host;
const remoteAddress: string | undefined = context.remoteAddress;
const snapshot = runtimeCatalog.getSnapshot();

// @ts-expect-error Runtime snapshots are immutable public data.
snapshot.name = 'Changed';
// @ts-expect-error Request contexts expose immutable effective host metadata.
context.host = 'attacker.example';

void assetCatalog;
void requestGate;
void restartCapability;
void protocol;
void host;
void remoteAddress;
