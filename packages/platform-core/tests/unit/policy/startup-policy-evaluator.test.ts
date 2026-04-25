import { describe, expect, it } from 'vitest';
import { evaluateStartupPolicy } from '../../../src/policy/startup-policy-evaluator.js';

describe('evaluateStartupPolicy', () => {
  it('aborts when module is critical regardless of policy mode', () => {
    const result = evaluateStartupPolicy({
      policyMode: 'best-effort',
      moduleId: 'mod-a',
      critical: true,
    });

    expect(result.action).toBe('abort');
    expect(result.degraded).toBe(false);
  });

  it('aborts in strict mode for non-critical module', () => {
    const result = evaluateStartupPolicy({
      policyMode: 'strict',
      moduleId: 'mod-b',
      critical: false,
    });

    expect(result.action).toBe('abort');
    expect(result.degraded).toBe(false);
  });

  it('skips with degraded in best-effort mode for non-critical module', () => {
    const result = evaluateStartupPolicy({
      policyMode: 'best-effort',
      moduleId: 'mod-c',
      critical: false,
    });

    expect(result.action).toBe('skip');
    expect(result.degraded).toBe(true);
  });
});
