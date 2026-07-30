import type {
  IPlatformRuntimeVersionContext,
  PlatformStartupPolicyType,
} from '@prosto/platform-sdk';
import type { IRuntimeFailureDiagnostic } from '@/diagnostics/index.js';
import type {
  IModuleCandidateArtifact,
  IModuleEnvelope,
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
  readonly policyMode: PlatformStartupPolicyType;
  readonly correlationId: string;
  readonly startupStartedAt: string;
  readonly runtimeVersion: IPlatformRuntimeVersionContext;
  readonly stageOutcomes: IBootstrapStageOutcome[];
  readonly validatedModules: IModuleEnvelope[];
  readonly loadedModules: IModuleEnvelope[];
  readonly failedDiagnostics: IRuntimeFailureDiagnostic[];
  readonly moduleSources: readonly ModuleArtifactSourceDescriptorType[];
  readonly preRejectedArtifacts: readonly IRejectedModuleArtifact[];
  readonly candidates: readonly IModuleCandidateArtifact[];
  readonly skippedModuleIds: Set<string>;
  abort: boolean;
}
