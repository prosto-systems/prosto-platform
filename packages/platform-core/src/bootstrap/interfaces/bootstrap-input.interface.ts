import type {
  IPlatformRuntimeVersionContext,
  StartupPolicyType,
} from '@prosto/platform-sdk';
import type { ModuleArtifactSourceDescriptorType } from '@/modularity/index.js';

/**
 * @alpha
 * Input parameters for the bootstrap coordinator.
 */
export interface IBootstrapInput {
  readonly policyMode: StartupPolicyType;
  readonly runtimeVersion: IPlatformRuntimeVersionContext;
  readonly modules: readonly ModuleArtifactSourceDescriptorType[];
  readonly correlationId: string;
  readonly startupStartedAt: string;
}
