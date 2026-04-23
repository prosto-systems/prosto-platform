import type {
  IBootstrapCoordinatorLifecycleResult,
} from '../bootstrap/bootstrap.types.js';
import type {
  IRuntimeFailureDiagnostic,
  IRuntimeShutdownReport,
  IRuntimeStartupReport,
} from '../diagnostics/diagnostics.types.js';
import type {
  IPlatformRuntime,
  IRuntimeOptions,
} from './runtime.types.js';
import { coordinateBootstrap } from '../bootstrap/bootstrap-coordinator.js';
import { RuntimeReasonCodes } from '../compatibility/reason-codes.js';
import {
  createShutdownReport,
  createStartupReport,
} from '../diagnostics/diagnostics-reporter.js';
import { InMemoryEventBus } from '../events/in-memory-event-bus.js';
import {
  runShutdownLifecycle,
  runStartupLifecycle,
} from '../lifecycle/lifecycle-orchestrator.js';
import { discoverModules } from '../loader/module-discovery.js';
import { loadModuleArtifacts } from '../loader/module-loader.js';
import {
  ConsoleModuleLoggerFactory,
} from '../logging/module-logger/console/console-module-logger.factory.js';
import {
  ModuleContextFactory,
} from '../module-context/module-context.factory.js';
import {
  InMemoryServiceRegistry,
} from '../services/in-memory-service-registry.js';
import { dateNowIso } from '../utils/index.js';

function createCorrelationId(seed?: string): string {
  if (seed && seed.trim()) {
    return seed;
  }

  return `rt-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export async function createPlatformRuntime(
  options: IRuntimeOptions,
): Promise<IPlatformRuntime> {
  const correlationId = createCorrelationId(options.correlationId);
  const startupStartedAt = dateNowIso();
  const services = new InMemoryServiceRegistry();
  const events = new InMemoryEventBus();
  const loggerFactory = new ConsoleModuleLoggerFactory();
  const contextFactory = new ModuleContextFactory(services, events, loggerFactory);

  const discovery = discoverModules(options.modules);
  const loadedArtifacts = loadModuleArtifacts(discovery.candidates);

  const lifecycleResult = await runStartupLifecycle(
    loadedArtifacts.map((artifact) => artifact.module),
    contextFactory,
    options.startupPolicy,
    options.runtimeVersion.sdkVersion,
  );

  const bootstrapContext = coordinateBootstrap(
    {
      correlationId,
      startupStartedAt,
      policyMode: options.startupPolicy,
      runtimeVersion: options.runtimeVersion,
      candidates: loadedArtifacts,
    },
    lifecycleResult as IBootstrapCoordinatorLifecycleResult,
  );

  const failedDiagnosticsByModuleId =
    new Map<string, IRuntimeFailureDiagnostic>(
      bootstrapContext.failedDiagnostics.map((diagnostic) => [
        diagnostic.moduleId,
        diagnostic,
      ]),
    );

  const startupReport = createStartupReport({
    correlationId,
    policyMode: options.startupPolicy,
    startedAt: startupStartedAt,
    loadedModules: bootstrapContext.loadedModules.map((module) => ({
      moduleId: module.manifest.id,
      version: module.manifest.version,
    })),
    skippedModules: bootstrapContext.skippedModuleIds.map((moduleId) => {
      const reason = failedDiagnosticsByModuleId.get(moduleId);

      return {
        moduleId,
        reason: reason ?? {
          moduleId,
          phase: 'lifecycle',
          errorCode: RuntimeReasonCodes.LifecycleStartFailed,
          message: 'Module skipped by startup policy.',
          remediationHint: 'Inspect startup diagnostics for root cause.',
        },
      };
    }),
    failedModules: bootstrapContext.failedDiagnostics,
  });

  const reports: {
    startup: IRuntimeStartupReport;
    shutdown?: IRuntimeShutdownReport;
  } = {
    startup: startupReport,
  };

  let stopped = false;

  return {
    reports,
    startedModuleIds: bootstrapContext.loadedModules.map((module) => module.manifest.id),
    degraded: startupReport.degraded,
    async stop(): Promise<void> {
      if (stopped) {
        return;
      }

      const shutdownStartedAt = dateNowIso();
      const shutdown = await runShutdownLifecycle(
        bootstrapContext.loadedModules,
        contextFactory,
        options.startupPolicy,
        options.runtimeVersion.sdkVersion,
        options.shutdownTimeoutMs ?? 1000,
      );

      reports.shutdown = createShutdownReport({
        correlationId,
        startedAt: shutdownStartedAt,
        stopOrder: shutdown.stopOrder,
        issues: shutdown.issues,
      });

      stopped = true;
    },
  };
}
