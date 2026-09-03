import type { PlatformModuleEnvelope } from '../../entities/index.js';

/**
 * @alpha
 * Candidate module artifact.
 */
export interface IModuleCandidateArtifact {
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly moduleEnvelope: PlatformModuleEnvelope;
}
