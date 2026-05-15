import type {
  IPlatformRuntimeVersionContext,
  StartupPolicyType,
} from '@prosto/platform-sdk';
import type { ModuleArtifactSourceDescriptorType } from '@/loader/index.js';

/**
 * @alpha
 * Configuration options for creating a platform runtime instance.
 */
export interface IRuntimeOptions {
  readonly modules: readonly ModuleArtifactSourceDescriptorType[];
  readonly startupPolicy: StartupPolicyType;
  readonly runtimeVersion: IPlatformRuntimeVersionContext;
  readonly correlationId?: string;
  readonly shutdownTimeoutMs?: number;
}
