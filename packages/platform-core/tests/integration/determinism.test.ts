import { describe, expect, it } from 'vitest';
import { createPlatformRuntime } from '../../src/runtime/create-runtime.js';
import { createManifest, TestModule } from './runtime-fixtures.js';

describe('runtime determinism', () => {
  it('produces identical startup order for identical module set across repeated runs', async () => {
    const createRuntime = async () => {
      const moduleA = new TestModule(createManifest({ id: 'module-a' }));
      const moduleB = new TestModule(
        createManifest({ id: 'module-b', dependencies: [{ id: 'module-a', version: '^1.0.0' }] }),
      );
      const moduleC = new TestModule(
        createManifest({ id: 'module-c', dependencies: [{ id: 'module-b', version: '^1.0.0' }] }),
      );

      return createPlatformRuntime({
        startupPolicy: 'strict',
        runtimeVersion: {
          sdkVersion: '0.0.0',
          nodeVersion: process.versions.node,
        },
        modules: [{ module: moduleC }, { module: moduleA }, { module: moduleB }],
      });
    };

    const runs = await Promise.all([createRuntime(), createRuntime(), createRuntime()]);
    const orders = runs.map((runtime) => runtime.startedModuleIds.join(','));

    expect(new Set(orders).size).toBe(1);
    expect(orders[0]).toBe('module-a,module-b,module-c');

    runs.forEach((runtime) => runtime.stop());
  });
});
