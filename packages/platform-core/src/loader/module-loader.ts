import type { IModuleCandidateArtifact } from './loader.types.js';

export function loadModuleArtifacts(
  candidates: readonly IModuleCandidateArtifact[],
): readonly IModuleCandidateArtifact[] {
  return [...candidates]
    .sort((left, right) => left.orderingKey.localeCompare(right.orderingKey));
}
