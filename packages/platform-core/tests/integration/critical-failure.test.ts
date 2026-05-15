import { describe, expect, it } from 'vitest';
import {
  createManifest,
  createRuntime,
  TestModule,
} from '@/tests/fixtures/index.js';

describe('runtime bootstrap critical failure', () => {
  it('aborts startup even in best-effort mode when critical module fails', async () => {
    const critical = new TestModule(
      createManifest({
        id: 'module-critical',
        criticality: 'critical',
      }),
      { failOnStart: true },
    );

    const nonCritical = new TestModule(createManifest({ id: 'module-normal' }));

    const runtime = await createRuntime({
      startupPolicy: 'best-effort',
      runtimeVersion: {
        sdkVersion: '0.0.0',
        nodeVersion: process.versions.node,
      },
      modules: [
        { module: nonCritical, type: 'memory' },
        { module: critical, type: 'memory' },
      ],
    });

    expect(runtime.reports.startup?.status).toBe('failed');
    expect(runtime.startedModuleIds).toEqual([]);
    expect(runtime.reports.startup?.failedModules.some((item) => item.moduleId === 'module-critical')).toBe(true);

    await runtime.stop();
  });
});
