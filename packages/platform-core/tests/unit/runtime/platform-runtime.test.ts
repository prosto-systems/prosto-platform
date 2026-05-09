import { describe, expect, it } from 'vitest';
import type { IBootstrapCoordinator } from '@/bootstrap/index.js';
import type {
  IDiagnosticsReporter,
  IShutdownReportInput,
  IStartupReportInput,
  IRuntimeShutdownReport,
  IRuntimeStartupReport,
} from '@/diagnostics/index.js';
import { RuntimeStartupStatus } from '@/diagnostics/index.js';
import type { IModuleLifecycleOrchestrator } from '@/lifecycle/index.js';
import { PlatformRuntime } from '@/runtime/index.js';
import { createManifest, TestModule } from '@/tests/fixtures/index.js';

class TestDiagnosticsReporter implements IDiagnosticsReporter {
  createStartupReport(input: IStartupReportInput): IRuntimeStartupReport {
    return {
      type: 'startup',
      status: RuntimeStartupStatus.Success,
      degraded: false,
      correlationId: input.correlationId,
      startedAt: input.startedAt,
      completedAt: input.startedAt,
      policyMode: input.policyMode,
      loadedModules: [...input.loadedModules],
      skippedModules: [...input.skippedModules],
      failedModules: [...input.failedModules],
    };
  }

  createShutdownReport(input: IShutdownReportInput): IRuntimeShutdownReport {
    return {
      type: 'shutdown',
      correlationId: input.correlationId,
      startedAt: input.startedAt,
      completedAt: input.startedAt,
      stopOrder: [...input.stopOrder],
      issues: [...input.issues],
    };
  }
}

describe('PlatformRuntime', () => {
  it('starts and stops runtime via injected collaborators', async () => {
    const module = new TestModule(createManifest({ id: 'module-a' }));

    const bootstrapCoordinator: IBootstrapCoordinator = {
      async coordinate() {
        return {
          policyMode: 'strict',
          loadedModules: [module],
          skippedModuleIds: [],
          failedDiagnostics: [],
          stageOutcomes: [],
        };
      },
    };

    const lifecycleOrchestrator: IModuleLifecycleOrchestrator = {
      async startup(loadedModules) {
        return { startedModules: [...loadedModules], issues: [] };
      },
      async shutdown(startedModules) {
        return {
          stopOrder: startedModules.map((item) => item.manifest.id).reverse(),
          issues: [],
        };
      },
    };

    const runtime = new PlatformRuntime(
      {
        startupPolicy: 'strict',
        runtimeVersion: {
          sdkVersion: '0.0.0',
          nodeVersion: process.versions.node,
        },
        modules: [{ type: 'memory', module }],
      },
      new TestDiagnosticsReporter(),
      bootstrapCoordinator,
      lifecycleOrchestrator,
    );

    await runtime.start();

    expect(runtime.started).toBe(true);
    expect(runtime.stopped).toBe(false);
    expect(runtime.startedModuleIds).toEqual(['module-a']);
    expect(runtime.reports.startup?.status).toBe(RuntimeStartupStatus.Success);

    await runtime.stop();

    expect(runtime.stopped).toBe(true);
    expect(runtime.started).toBe(false);
    expect(runtime.reports.shutdown?.stopOrder).toEqual(['module-a']);
  });
});
