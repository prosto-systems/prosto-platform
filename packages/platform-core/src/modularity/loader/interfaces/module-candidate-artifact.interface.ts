import type { PlatformModuleEnvelope } from '../../entities/index.js';
import type {
  ModuleArtifactPackaging,
  ModuleArtifactSource,
} from '../constants/index.js';

/**
 * @alpha
 * Candidate module artifact after successful loading and validation.
 */
export interface IModuleCandidateArtifact {
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly moduleEnvelope: PlatformModuleEnvelope;
  readonly orderingKey: string;
  readonly sourceType: `${ModuleArtifactSource}`;
  readonly sourceRef: string;
  readonly packaging: `${ModuleArtifactPackaging}`;
}
