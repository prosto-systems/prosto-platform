import { describe, expect, it } from 'vitest';
import { validateOperationalReportsSchema } from '../../src/diagnostics/diagnostics.schema.js';
import { createPlatformRuntime } from '../../src/runtime/create-runtime.js';
import { createManifest, TestModule } from './runtime-fixtures.js';

describe('runtime policy diagnostics validation', () => {
  it('produces startup diagnostics payload with required fields', async () => {
    const moduleA = new TestModule(createManifest({ id: 'module-a' }));

    const runtime = await createPlatformRuntime({
      startupPolicy: 'strict',
      runtimeVersion: {
        sdkVersion: '0.0.0',
        nodeVersion: process.versions.node,
      },
      modules: [{ module: moduleA }],
      correlationId: 'rt-validation-test',
    });

    expect(() => validateOperationalReportsSchema(runtime.reports)).not.toThrow();
    expect(runtime.reports.startup.correlationId).toBe('rt-validation-test');
    expect(runtime.reports.startup.policyMode).toBe('strict');

    await runtime.stop()
  });
});
