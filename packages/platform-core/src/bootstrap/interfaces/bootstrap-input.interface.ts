import type {
  IPlatformRuntimeVersionContext,
  PlatformStartupPolicyType,
} from '@prosto/platform-sdk';
import type { ModuleArtifactSourceDescriptorType } from '@/modularity/index.js';

/**
 * @alpha
 * Input parameters for the bootstrap coordinator.
 */
export interface IBootstrapInput {
  readonly policyMode: PlatformStartupPolicyType;
  readonly runtimeVersion: IPlatformRuntimeVersionContext;
  readonly modules: readonly ModuleArtifactSourceDescriptorType[];
  readonly correlationId: string;
  readonly startupStartedAt: string;
}
