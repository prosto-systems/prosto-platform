import type { RuntimeReasonCodes, RuntimeStage } from '@/runtime/index.js';

/**
 * @alpha
 * Interface representing diagnostic information for a module lifecycle shutdown issue.
 */
export interface IModuleLifecycleShutdownIssue {
  readonly moduleId: string;
  readonly phase: `${RuntimeStage.Shutdown}`;
  readonly errorCode: `${RuntimeReasonCodes}`;
  readonly message: string;
  readonly remediationHint: string;
}
