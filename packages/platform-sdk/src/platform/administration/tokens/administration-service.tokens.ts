import type {
  IAdminAssetCatalog,
  IHostRestartCapability,
  IPlatformRuntimeCatalog,
} from '../interfaces/index.js';
import { createServiceToken } from '@/platform/services/index.js';

/** @alpha Typed token for the sanitized platform runtime catalog. */
export const PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN =
  createServiceToken<IPlatformRuntimeCatalog>('platform-runtime-catalog');

/** @alpha Typed token for the trusted administration plugin asset catalog. */
export const ADMIN_ASSET_CATALOG_SERVICE_TOKEN =
  createServiceToken<IAdminAssetCatalog>('admin-asset-catalog');

/** @alpha Typed token for the idempotent local host restart capability. */
export const HOST_RESTART_CAPABILITY_SERVICE_TOKEN =
  createServiceToken<IHostRestartCapability>('host-restart-capability');
