import type { IPlatformModule } from '@prosto/platform-sdk';
import type {
  ModuleArtifactPackaging,
  ModuleArtifactSource,
} from '../constants/index.js';

/**
 * @alpha
 * Candidate module artifact after successful loading and validation.
 */
export interface IModuleCandidateArtifact {
  readonly module: IPlatformModule;
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly orderingKey: string;
  readonly sourceType: `${ModuleArtifactSource}`;
  readonly sourceRef: string;
  readonly packaging: `${ModuleArtifactPackaging}`;
}
