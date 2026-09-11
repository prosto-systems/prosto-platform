import type { PlatformStartupPolicyType } from '@prosto/platform-sdk/platform';
import type { IRuntimeFailureDiagnostic } from '@/diagnostics/index.js';
import type { PlatformModuleEnvelope } from '@/modularity/index.js';
import type { IBootstrapStageOutcome } from './bootstrap-stage-context.interface.js';

/**
 * @alpha
 * Output context from the bootstrap coordinator after processing all stages.
 */
export interface IBootstrapContext {
  readonly policyMode: PlatformStartupPolicyType;
  /** @internal Whether the bootstrap pipeline stopped at a fatal barrier. */
  readonly aborted: boolean;
  readonly loadedModules: readonly PlatformModuleEnvelope[];
  /** @internal Modules whose `start()` hooks completed successfully. */
  readonly startedModules: readonly PlatformModuleEnvelope[];
  readonly skippedModuleIds: readonly string[];
  readonly failedDiagnostics: readonly IRuntimeFailureDiagnostic[];
  /** @internal All discovered module metadata retained for sanitized catalogs. */
  readonly moduleEnvelopes: readonly PlatformModuleEnvelope[];
  readonly stageOutcomes: readonly IBootstrapStageOutcome[];
}
