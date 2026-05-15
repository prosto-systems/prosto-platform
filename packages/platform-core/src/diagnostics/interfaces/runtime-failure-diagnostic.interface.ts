import type { RuntimeReasonCodes, RuntimeStage } from '@/runtime/index.js';

/**
 * @alpha
 * Interface representing diagnostic information for a runtime failure.
 */
export interface IRuntimeFailureDiagnostic {
  readonly moduleId: string;
  readonly phase: `${RuntimeStage}`;
  readonly errorCode: `${RuntimeReasonCodes}`;
  readonly message: string;
  readonly remediationHint: string;
}
