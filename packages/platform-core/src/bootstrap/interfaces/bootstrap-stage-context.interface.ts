import type {
  IPlatformModule,
  IPlatformRuntimeVersionContext,
  StartupPolicyType,
} from '@prosto/platform-sdk';
import type { IRuntimeFailureDiagnostic } from '@/diagnostics/index.js';
import type {
  IModuleCandidateArtifact,
  IRejectedModuleArtifact,
  ModuleArtifactSourceDescriptorType,
} from '@/modularity/index.js';
import type { BootstrapStage } from '../constants/index.js';

/**
 * @alpha
 * Outcome of a bootstrap stage execution.
 */
export interface IBootstrapStageOutcome {
  readonly stage: BootstrapStage;
  readonly ok: boolean;
  readonly details?: string;
}

/**
 * @alpha
 * Context passed through the bootstrap pipeline stages.
 */
export interface IBootstrapStageContext {
  readonly policyMode: StartupPolicyType;
  readonly correlationId: string;
  readonly startupStartedAt: string;
  readonly runtimeVersion: IPlatformRuntimeVersionContext;
  readonly stageOutcomes: IBootstrapStageOutcome[];
  readonly validatedModules: IPlatformModule[];
  readonly loadedModules: IPlatformModule[];
  readonly failedDiagnostics: IRuntimeFailureDiagnostic[];
  readonly moduleSources: readonly ModuleArtifactSourceDescriptorType[];
  readonly preRejectedArtifacts: readonly IRejectedModuleArtifact[];
  readonly candidates: readonly IModuleCandidateArtifact[];
  readonly skippedModuleIds: Set<string>;
  abort: boolean;
}
