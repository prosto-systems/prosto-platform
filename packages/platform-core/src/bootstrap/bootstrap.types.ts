import type {
  IPlatformModule,
  IPlatformRuntimeVersionContext,
  StartupPolicyType,
} from '@prosto/platform-sdk';
import type { RuntimeReasonCodes } from '../compatibility/reason-codes.js';
import type {
  IRuntimeFailureDiagnostic,
  IRuntimeStartupReport,
} from '../diagnostics/diagnostics.types.js';
import type {
  IModuleCandidateArtifact,
  IRejectedModuleArtifact,
} from '../loader/loader.types.js';

export type BootstrapStageType =
  | 'discover'
  | 'validate'
  | 'resolve'
  | 'lifecycle';

export interface IBootstrapStageOutcome {
  readonly stage: BootstrapStageType;
  readonly ok: boolean;
  readonly details?: string;
}

export interface IBootstrapContext {
  readonly policyMode: StartupPolicyType;
  readonly stageOutcomes: readonly IBootstrapStageOutcome[];
  readonly loadedModules: readonly IPlatformModule[];
  readonly skippedModuleIds: readonly string[];
  readonly failedDiagnostics: readonly IRuntimeFailureDiagnostic[];
  readonly startupReport: IRuntimeStartupReport;
}

export interface IBootstrapCoordinatorInput {
  readonly policyMode: StartupPolicyType;
  readonly runtimeVersion: IPlatformRuntimeVersionContext;
  readonly candidates: readonly IModuleCandidateArtifact[];
  readonly preRejectedArtifacts: readonly IRejectedModuleArtifact[];
  readonly correlationId: string;
  readonly startupStartedAt: string;
}

export interface IBootstrapCoordinatorLifecycleInput {
  readonly orderedModules: readonly IPlatformModule[];
}

export interface IBootstrapLifecycleIssue {
  readonly moduleId: string;
  // readonly errorCode: 'LIFECYCLE_REGISTER_FAILED' | 'LIFECYCLE_INIT_FAILED' | 'LIFECYCLE_START_FAILED';
  readonly errorCode:
    | RuntimeReasonCodes.LifecycleRegisterFailed
    | RuntimeReasonCodes.LifecycleInitFailed
    | RuntimeReasonCodes.LifecycleStartFailed;
  readonly message: string;
  readonly remediationHint: string;
}

export interface IBootstrapCoordinatorLifecycleResult {
  readonly startedModules: readonly IPlatformModule[];
  readonly issues: readonly IBootstrapLifecycleIssue[];
}
