import type { IAdminModuleAssets } from './interfaces/index.js';

const adminAssetsByModule = new WeakMap<object, IAdminModuleAssets>();

/** @internal Associates private asset declarations with one runtime module. */
export function setAdminModuleAssets(
  moduleEnvelope: object,
  assets?: IAdminModuleAssets,
): void {
  if (assets) {
    adminAssetsByModule.set(moduleEnvelope, assets);
  } else {
    adminAssetsByModule.delete(moduleEnvelope);
  }
}

/** @internal Gets private asset declarations without exposing probing paths. */
export function getAdminModuleAssets(
  moduleEnvelope: object,
): IAdminModuleAssets | undefined {
  return adminAssetsByModule.get(moduleEnvelope);
}
