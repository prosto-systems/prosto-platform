import type { ModuleLifecycleStageType } from '@prosto/platform-sdk';
import type { RuntimeReasonCodes, RuntimeStage } from '@/runtime/index.js';

/**
 * @alpha
 * Type representing the startup stages of a module lifecycle.
 */
export type ModuleStartupStagesType = Exclude<ModuleLifecycleStageType, 'stop'>;

/**
 * @alpha
 * Interface representing diagnostic information for a module lifecycle execution issue.
 */
export interface IModuleLifecycleExecutionIssue {
  readonly moduleId: string;
  readonly phase: `${RuntimeStage.Lifecycle}`;
  readonly lifecycleStage: ModuleStartupStagesType;
  readonly errorCode: `${RuntimeReasonCodes}`;
  readonly message: string;
  readonly remediationHint: string;
}
