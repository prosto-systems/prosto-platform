import type {
  IPersistenceDescriptor,
  IPersistenceRuntimeAdapter,
  IPlatformRuntimeVersionContext,
  IServiceRegistry,
  PlatformStartupPolicyType,
} from '@prosto/platform-sdk/platform';
import type { IRuntimeFailureDiagnostic } from '@/diagnostics/index.js';
import type {
  IModuleCandidateArtifact,
  PlatformModuleEnvelope,
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
  readonly validatedModules: PlatformModuleEnvelope[];
  readonly loadedModules: PlatformModuleEnvelope[];
  /** @internal Modules whose `start()` hooks completed successfully. */
  readonly startedModules: PlatformModuleEnvelope[];
  readonly failedDiagnostics: IRuntimeFailureDiagnostic[];
  readonly candidates: readonly IModuleCandidateArtifact[];
  readonly skippedModuleIds: Set<string>;
  readonly persistenceAdapter: IPersistenceRuntimeAdapter;
  readonly platformPersistenceDescriptor?: IPersistenceDescriptor;
  readonly services: IServiceRegistry;
  abort: boolean;
}
