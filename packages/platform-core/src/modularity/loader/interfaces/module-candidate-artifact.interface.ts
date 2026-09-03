import type { PlatformModuleEnvelope } from '../../entities/index.js';

/**
 * @alpha
 * Manifest metadata discovered before compatibility and dependency validation.
 *
 * The candidate does not contain executable module code. The module instance
 * is attached to its envelope only after the package is available in the
 * probing directory.
 */
export interface IModuleCandidateArtifact {
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly moduleEnvelope: PlatformModuleEnvelope;
}
