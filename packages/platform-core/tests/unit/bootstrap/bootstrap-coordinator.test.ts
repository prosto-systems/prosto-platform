import { describe, expect, it } from 'vitest';
import {
  BootstrapCoordinator,
  BootstrapPipeline,
  DiscoverStage,
  ModuleLifecycleStage,
  ResolveDependenciesStage,
  ValidateStage,
} from '@/bootstrap/index.js';
import { ModuleContextFactory } from '@/context/index.js';
import { InMemoryEventBus } from '@/events/index.js';
import { ModuleLifecycleOrchestrator } from '@/lifecycle/index.js';
import { ModuleLoader } from '@/loader/index.js';
import { ConsoleModuleLoggerFactory } from '@/logging/index.js';
import {
  BestEffortPolicyStrategy,
  StartupPolicyEvaluator,
  StrictPolicyStrategy,
} from '@/policy/index.js';
import { InMemoryServiceRegistry } from '@/services/index.js';
import { createManifest, TestModule } from '@/tests/fixtures/index.js';
import {
  CompatibilityValidationStrategy,
  IntegrityValidationStrategy,
  ManifestValidationStrategy,
} from '@/validation/index.js';

describe('BootstrapCoordinator', () => {
  it('coordinates discover -> validate -> resolve -> lifecycle and starts modules', async () => {
    const module = new TestModule(createManifest({ id: 'module-a' }));

    const moduleLoader = new ModuleLoader();

    const startupPolicyEvaluator = new StartupPolicyEvaluator([
      new StrictPolicyStrategy(),
      new BestEffortPolicyStrategy(),
    ]);

    const serviceRegistry = new InMemoryServiceRegistry();
    const eventBus = new InMemoryEventBus();
    const moduleContextFactory = new ModuleContextFactory(
      new ConsoleModuleLoggerFactory(),
      serviceRegistry,
      eventBus,
    );

    const moduleLifecycleOrchestrator = new ModuleLifecycleOrchestrator(moduleContextFactory);

    const bootstrapCoordinator = new BootstrapCoordinator(
      BootstrapPipeline.create([
        new DiscoverStage(moduleLoader),
        new ValidateStage([
          new ManifestValidationStrategy(),
          new CompatibilityValidationStrategy(),
          new IntegrityValidationStrategy(),
        ]),
        new ResolveDependenciesStage(startupPolicyEvaluator),
        new ModuleLifecycleStage(
          startupPolicyEvaluator,
          moduleLifecycleOrchestrator,
        ),
      ]),
    );

    const result = await bootstrapCoordinator.coordinate({
      policyMode: 'strict',
      runtimeVersion: {
        sdkVersion: '0.0.0',
        nodeVersion: process.versions.node,
      },
      modules: [{ type: 'memory', module }],
      correlationId: 'cid',
      startupStartedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(result.loadedModules.map((item) => item.manifest.id)).toEqual(['module-a']);
    expect(result.failedDiagnostics).toEqual([]);
    expect(result.stageOutcomes).toHaveLength(4);
  });
});
