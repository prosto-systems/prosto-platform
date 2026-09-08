import type { IPlatformModuleManifest } from '@prosto/platform-sdk/platform';

export function isModuleCritical(moduleManifest: IPlatformModuleManifest) {
  return !moduleManifest.optional;
}
