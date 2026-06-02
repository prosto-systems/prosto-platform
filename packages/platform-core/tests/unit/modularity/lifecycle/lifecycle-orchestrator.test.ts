import type { IPlatformConfig } from '@/runtime/index.js';
import { RuntimeErrorCodes } from '@/common/index.js';
import { describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@/events/index.js';
import { ConsoleModuleLoggerFactory } from '@/logging/index.js';
import {
  ModuleContextFactory,
  ModuleLifecycleOrchestrator,
} from '@/modularity/index.js';
import { InMemoryServiceRegistry } from '@/services/index.js';
import { createManifest, TestModule } from '@/tests/fixtures/index.js';

describe('ModuleLifecycleOrchestrator', () => {
  it('collects startup issues when module stage fails', async () => {
    const moduleA = new TestModule(createManifest({ id: 'module-a' }));
    const moduleB = new TestModule(createManifest({ id: 'module-b' }), {
      failOnStart: true,
    });

    const serviceRegistry = new InMemoryServiceRegistry();
    const eventBus = new InMemoryEventBus();
    const contextFactory = new ModuleContextFactory(
      'production',
      {} as IPlatformConfig,
      eventBus,
      serviceRegistry,
      new ConsoleModuleLoggerFactory(),
    );

    const moduleLifecycleOrchestrator = new ModuleLifecycleOrchestrator(
      contextFactory,
    );
    const result = await moduleLifecycleOrchestrator.startup(
      [moduleA, moduleB],
      {
        startupPolicy: 'strict',
        sdkVersion: '0.0.0',
      },
    );

    expect(result.startedModules.map((item) => item.manifest.id)).toEqual([
      'module-a',
    ]);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.errorCode).toBe(
      RuntimeErrorCodes.LifecycleStartFailed,
    );
  });

  it('reports shutdown timeout issue', async () => {
    const slowModule = new TestModule(createManifest({ id: 'module-slow' }), {
      stopDelayMs: 50,
    });

    const serviceRegistry = new InMemoryServiceRegistry();
    const eventBus = new InMemoryEventBus();
    const contextFactory = new ModuleContextFactory(
      'production',
      {} as IPlatformConfig,
      eventBus,
      serviceRegistry,
      new ConsoleModuleLoggerFactory(),
    );

    const moduleLifecycleOrchestrator = new ModuleLifecycleOrchestrator(
      contextFactory,
    );
    const result = await moduleLifecycleOrchestrator.shutdown([slowModule], {
      startupPolicy: 'strict',
      sdkVersion: '0.0.0',
      timeoutMs: 10,
    });

    expect(result.stopOrder).toEqual(['module-slow']);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.errorCode).toBe(RuntimeErrorCodes.ShutdownTimeout);
  });
});
