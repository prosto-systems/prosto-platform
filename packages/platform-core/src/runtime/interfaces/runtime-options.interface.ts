import type {
  IPlatformRuntimeVersionContext,
  StartupPolicyType,
} from '@prosto/platform-sdk';
import type { IArtifactCacheOptions } from '@/cache/index.js';
import type {
  ModuleArtifactSourceDescriptorType,
} from '@/loader/index.js';

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
  /**
   * Configuration for artifact caching
   * @default false
   */
  readonly artifactCache?: boolean | IArtifactCacheOptions;
}
