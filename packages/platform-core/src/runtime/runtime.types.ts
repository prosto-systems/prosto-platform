import type {
  IPlatformModule,
  IPlatformRuntimeVersionContext,
  StartupPolicyType,
} from '@prosto/platform-sdk';
import type { IRuntimeOperationalReports } from '../diagnostics/diagnostics.types.js';
import type {
  ModuleArtifactSourceDescriptorType,
} from '../loader/loader.types.js';

/**
 * @alpha
 * In-memory module reference passed directly to the runtime.
 */
export interface IRuntimeInMemoryModuleRef {
  readonly module: IPlatformModule;
}

/**
 * @alpha
 * Artifact-based module reference resolved from an external source.
 */
export interface IRuntimeArtifactModuleRef {
  readonly source: ModuleArtifactSourceDescriptorType;
  readonly moduleIdHint?: string;
}

/**
 * @alpha
 * Union of all supported module reference types.
 */
export type RuntimeModuleRefType = IRuntimeInMemoryModuleRef | IRuntimeArtifactModuleRef;

/**
 * @alpha
 * Configuration options for creating a platform runtime instance.
 */
export interface IRuntimeOptions {
  readonly startupPolicy: StartupPolicyType;
  readonly runtimeVersion: IPlatformRuntimeVersionContext;
  readonly modules: readonly RuntimeModuleRefType[];
  readonly shutdownTimeoutMs?: number;
  readonly correlationId?: string;
}

/**
 * @alpha
 * Active platform runtime with startup reports and lifecycle control.
 */
export interface IPlatformRuntime {
  readonly reports: IRuntimeOperationalReports;
  readonly startedModuleIds: readonly string[];
  readonly degraded: boolean;
  stop(): Promise<void>;
}
