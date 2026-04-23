import type { IRuntimeModuleRef } from '../runtime/runtime.types.js';
import type { IModuleCandidateArtifact, IModuleDiscoveryResult } from './loader.types.js';

export function discoverModules(moduleRefs: readonly IRuntimeModuleRef[]): IModuleDiscoveryResult {
  const candidates: IModuleCandidateArtifact[] = moduleRefs
    .map((ref) => {
      const moduleId = ref.module.manifest.id;
      const moduleVersion = ref.module.manifest.version;

      return {
        module: ref.module,
        moduleId,
        moduleVersion,
        orderingKey: `${moduleId}@${moduleVersion}`,
      };
    })
    .sort((left, right) => left.orderingKey.localeCompare(right.orderingKey));

  return {
    candidates,
    rejected: [],
  };
}
