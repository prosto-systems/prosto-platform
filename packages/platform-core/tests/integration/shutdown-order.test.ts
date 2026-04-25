import { describe, expect, it } from 'vitest';
import { createPlatformRuntime } from '../../src/runtime/create-runtime.js';
import { createManifest, TestModule } from './runtime-fixtures.js';

describe('runtime shutdown', () => {
  it('stops modules in reverse startup order', async () => {
    const moduleA = new TestModule(createManifest({ id: 'module-a' }));
    const moduleB = new TestModule(
      createManifest({
        id: 'module-b',
        dependencies: [{ id: 'module-a', version: '^1.0.0' }],
      }),
    );

    const runtime = await createPlatformRuntime({
      startupPolicy: 'strict',
      runtimeVersion: {
        sdkVersion: '0.0.0',
        nodeVersion: process.versions.node,
      },
      modules: [{ module: moduleB }, { module: moduleA }],
    });

    await runtime.stop();

    expect(runtime.reports.shutdown?.stopOrder).toEqual(['module-b', 'module-a']);
    expect(runtime.reports.shutdown?.issues).toEqual([]);
  });
});
