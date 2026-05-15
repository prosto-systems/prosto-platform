import type { IPlatformModule } from '@prosto/platform-sdk';
import type { IBootstrapCoordinator } from '@/bootstrap/index.js';
import type {
  IDiagnosticsReporter,
  IRuntimeFailureDiagnostic,
  IRuntimeOperationalReports,
} from '@/diagnostics/index.js';
import { RuntimeStartupStatus } from '@/diagnostics/index.js';
import type { IModuleLifecycleOrchestrator } from '@/lifecycle/index.js';
import type { IPlatformRuntime, IRuntimeOptions } from './interfaces/index.js';
import { assert, dateNowIso } from '@/common/index.js';

/**
 * @alpha
 * Platform runtime implementation that orchestrates
 * the bootstrapping process and modules lifecycle.
 */
export class PlatformRuntime implements IPlatformRuntime {
  private _startedModules: readonly IPlatformModule[] = [];
  private _stoppingPromise: Promise<void> | null = null;

  private readonly _correlationId: string;

  constructor(
    private readonly _options: IRuntimeOptions,
    private readonly _diagnosticsReporter: IDiagnosticsReporter,
    private readonly _bootstrapCoordinator: IBootstrapCoordinator,
    private readonly _moduleLifecycleOrchestrator: IModuleLifecycleOrchestrator,
    private readonly _cleanup = () => {
      /* To clean up resources during shutdown */
    },
  ) {
    this._correlationId = this.createCorrelationId(this._options.correlationId);
  }

  get startedModuleIds(): readonly string[] {
    return this._startedModules.map((module) => module.manifest.id);
  }

  private _started = false;

  get started(): boolean {
    return this._started;
  }

  private _degraded = false;

  get degraded(): boolean {
    return this._degraded;
  }

  private _stopped = false;

  get stopped(): boolean {
    return this._stopped;
  }

  private _reports: IRuntimeOperationalReports = {};

  get reports(): IRuntimeOperationalReports {
    return this._reports;
  }

  async start(): Promise<void> {
    if (this._started) return;

    const startupStartedAt = dateNowIso();

    const bootstrapContext = await this._bootstrapCoordinator.coordinate({
      startupStartedAt,
      correlationId: this._correlationId,
      policyMode: this._options.startupPolicy,
      runtimeVersion: this._options.runtimeVersion,
      modules: this._options.modules,
    });

    const failedDiagnosticsByModuleId = new Map<string, IRuntimeFailureDiagnostic>(
      bootstrapContext.failedDiagnostics.map((diagnostic) => [
        diagnostic.moduleId,
        diagnostic,
      ]),
    );

    const startupReport = this._diagnosticsReporter.createStartupReport({
      startedAt: startupStartedAt,
      correlationId: this._correlationId,
      policyMode: this._options.startupPolicy,
      failedModules: bootstrapContext.failedDiagnostics,
      loadedModules: bootstrapContext.loadedModules.map((module) => ({
        moduleId: module.manifest.id,
        version: module.manifest.version,
      })),
      skippedModules: bootstrapContext.skippedModuleIds.map((moduleId) => {
        const reason = failedDiagnosticsByModuleId.get(moduleId);
        assert(reason, `Failed diagnostic for module ${moduleId} not found.`);
        return { moduleId, reason };
      }),
    });

    this._reports = { startup: startupReport };
    this._started = startupReport.status !== RuntimeStartupStatus.Failed;
    this._degraded = startupReport.degraded;
    this._startedModules = bootstrapContext.loadedModules;
  }

  async stop(): Promise<void> {
    if (this._stopped) return;

    let resolveStoppingPromise: (() => void) | undefined;

    if (this._stoppingPromise) {
      return this._stoppingPromise;
    } else {
      this._stoppingPromise = new Promise(
        (resolve) => (resolveStoppingPromise = resolve),
      );
    }

    const shutdownStartedAt = dateNowIso();

    const shutdownResult = await this._moduleLifecycleOrchestrator.shutdown(
      this._startedModules,
      {
        startupPolicy: this._options.startupPolicy,
        sdkVersion: this._options.runtimeVersion.sdkVersion,
        timeoutMs: this._options.shutdownTimeoutMs ?? 5000,
      },
    );

    // Clean up resources
    this._cleanup();

    const shutdownReport = this._diagnosticsReporter.createShutdownReport({
      startedAt: shutdownStartedAt,
      correlationId: this._correlationId,
      stopOrder: shutdownResult.stopOrder,
      issues: shutdownResult.issues,
    });

    this._reports = { ...this._reports, shutdown: shutdownReport };
    this._stopped = true;
    this._started = false;

    if (resolveStoppingPromise) {
      resolveStoppingPromise();
      this._stoppingPromise = null;
    }
  }

  private createCorrelationId(seed?: string): string {
    if (seed && seed.trim()) {
      return seed;
    }

    return `rt-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }
}
