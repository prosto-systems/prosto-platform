import { describe, expect, it } from 'vitest';
import { validateOperationalReportsSchema } from '@/diagnostics/index.js';
import {
  createManifest,
  createRuntime,
  TestModule,
} from '@/tests/fixtures/index.js';

describe('runtime policy diagnostics validation', () => {
  it('produces startup diagnostics payload with required fields', async () => {
    const moduleA = new TestModule(createManifest({ id: 'module-a' }));

    const runtime = await createRuntime({
      startupPolicy: 'strict',
      runtimeVersion: {
        sdkVersion: '0.0.0',
        nodeVersion: process.versions.node,
      },
      modules: [{ module: moduleA, type: 'memory' }],
      correlationId: 'rt-validation-test',
    });

    expect(() => validateOperationalReportsSchema(runtime.reports)).not.toThrow();
    expect(runtime.reports.startup?.correlationId).toBe('rt-validation-test');
    expect(runtime.reports.startup?.policyMode).toBe('strict');

    await runtime.stop();
  });
});
