import { describe, expect, it } from 'vitest';
import { createPlatformRuntime } from '../../src/runtime/create-runtime.js';
import { createManifest, TestModule } from './runtime-fixtures.js';

describe('runtime bootstrap (strict)', () => {
  it('aborts startup on non-critical module failure in strict mode', async () => {
    const moduleA = new TestModule(createManifest({ id: 'module-a' }));
    const moduleB = new TestModule(
      createManifest({
        id: 'module-b',
        dependencies: [{ id: 'module-a', version: '^1.0.0' }],
      }),
      { failOnStart: true },
    );

    const runtime = await createPlatformRuntime({
      startupPolicy: 'strict',
      runtimeVersion: {
        sdkVersion: '0.0.0',
        nodeVersion: process.versions.node,
      },
      modules: [{ module: moduleB }, { module: moduleA }],
    });

    expect(runtime.reports.startup.status).toBe('failed');
    expect(runtime.reports.startup.degraded).toBe(true);
    expect(runtime.startedModuleIds).toEqual([]);
    expect(runtime.reports.startup.skippedModules.some((item) => item.moduleId === 'module-b')).toBe(true);
    expect(runtime.reports.startup.failedModules.some((item) => item.moduleId === 'module-b')).toBe(true);

    await runtime.stop()
  });
});
