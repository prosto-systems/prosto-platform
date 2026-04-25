import type {
  IStartupPolicyEvaluationInput,
  IStartupPolicyEvaluationResult,
} from './policy.types.js';

export function evaluateStartupPolicy(
  input: IStartupPolicyEvaluationInput,
): IStartupPolicyEvaluationResult {
  if (input.critical) {
    return {
      action: 'abort',
      degraded: false,
      reason: `Module "${input.moduleId}" is critical and startup must abort on failure.`,
    };
  }

  if (input.policyMode === 'strict') {
    return {
      action: 'abort',
      degraded: false,
      reason: `Startup policy is strict and module "${input.moduleId}" failed.`,
    };
  }

  return {
    action: 'skip',
    degraded: true,
    reason: `Startup policy is best-effort; module "${input.moduleId}" is skipped.`,
  };
}
