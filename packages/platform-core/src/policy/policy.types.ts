import type { StartupPolicyType } from '@prosto/platform-sdk';

export type StartupPolicyDecisionActionType = 'abort' | 'skip' | 'continue-degraded';

export interface IStartupPolicyEvaluationInput {
  readonly policyMode: StartupPolicyType;
  readonly moduleId: string;
  readonly critical: boolean;
}

export interface IStartupPolicyEvaluationResult {
  readonly action: StartupPolicyDecisionActionType;
  readonly degraded: boolean;
  readonly reason: string;
}
