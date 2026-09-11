import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import type { IBootstrapCoordinator } from '@/bootstrap/index.js';
import type {
  AdminAssetCatalog,
  PlatformRuntimeCatalog,
} from '@/administration/index.js';
import { getAdminModuleAssets } from '@/administration/index.js';
import type {
  IDiagnosticsReporter,
  IRuntimeFailureDiagnostic,
  IRuntimeOperationalReports,
  IRuntimeStartupReport,
} from '@/diagnostics/index.js';
import { RuntimeStartupStatus } from '@/diagnostics/index.js';
import type {
  IModuleLifecycleOrchestrator,
  IModuleLifecycleShutdownIssue,
  PlatformModuleEnvelope,
} from '@/modularity/index.js';
import type {
  IPlatformConfig,
  IPlatformRuntime,
  IRuntimeOptions,
} from './interfaces/index.js';
import type { AdapterLifecycleOrchestrator } from './adapters/index.js';
import {
  type IServiceRegistry,
  type PlatformStartupPolicyType,
  SDK_CONTRACT_VERSION,
} from '@prosto/platform-sdk/platform';
import {
  assert,
  dateNowIso,
  REBUILD_MARKER_FILE_NAME,
  RuntimeErrorCodes,
  RuntimeStage,
} from '@/common/index.js';

/**
 * @alpha
 * Platform runtime implementation that orchestrates
 * the bootstrapping process and modules lifecycle.
 */
export class PlatformRuntime implements IPlatformRuntime {
  private _startedModules: readonly PlatformModuleEnvelope[] = [];
  private _moduleEnvelopes: readonly PlatformModuleEnvelope[] = [];
  private _stoppingPromise: Promise<void> | null = null;
  private _applicationServicesStopped = false;

  private readonly _startupPolicy: PlatformStartupPolicyType;
  private readonly _correlationId: string;

  constructor(
    private readonly _config: Readonly<IPlatformConfig>,
    private readonly _diagnosticsReporter: IDiagnosticsReporter,
    private readonly _bootstrapCoordinator: IBootstrapCoordinator,
    private readonly _moduleLifecycleOrchestrator: IModuleLifecycleOrchestrator,
    private readonly _services: IServiceRegistry,
    private readonly _platformRuntimeCatalog: PlatformRuntimeCatalog,
    private readonly _adminAssetCatalog: AdminAssetCatalog,
    private readonly _options: IRuntimeOptions,
    private readonly _adapterLifecycleOrchestrator: AdapterLifecycleOrchestrator,
  ) {
    this._startupPolicy = this._config.platform.startupPolicy;
    this._correlationId = this._createCorrelationId(
      this._options.correlationId || this._config.runtime.correlationId,
    );
  }

  get startedModuleIds(): readonly string[] {
    return this._startedModules.map((moduleEnvelope) => moduleEnvelope.id);
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

  private _stopping = false;

  get stopping(): boolean {
    return this._stopping;
  }

  private _reports: IRuntimeOperationalReports = {};

  get reports(): IRuntimeOperationalReports {
    return this._reports;
  }

  /**
   * Runs the bootstrap pipeline once and records its startup report.
   */
  async start(): Promise<void> {
    if (this._started) return;

    if (this._stopped) {
      throw new Error('A stopped runtime cannot be started again.');
    }

    const startupStartedAt = dateNowIso();
    const policyMode = this._startupPolicy;
    let bootstrapContext:
      Awaited<ReturnType<IBootstrapCoordinator['coordinate']>> | undefined;

    try {
      await this._adapterLifecycleOrchestrator.initializeAll();
      bootstrapContext = await this._bootstrapCoordinator.coordinate({
        policyMode,
        startupStartedAt,
        correlationId: this._correlationId,
        runtimeVersion: this._options.runtimeVersion ?? {
          sdkVersion: SDK_CONTRACT_VERSION,
          nodeVersion: process.versions.node,
        },
        persistenceAdapter: this._options.adapters.persistence,
        platformPersistenceDescriptor:
          this._options.platformPersistenceDescriptor,
        services: this._services,
      });
    } catch (error) {
      this._publishStartupReport(
        policyMode,
        startupStartedAt,
        bootstrapContext,
        this._adapterLifecycleOrchestrator.startupFailure
          ? []
          : [this._createStartupFailureDiagnostic()],
      );
      await this.stop();
      this._publishStartupReport(
        policyMode,
        startupStartedAt,
        bootstrapContext,
        this._adapterLifecycleOrchestrator.startupFailure
          ? []
          : [this._createStartupFailureDiagnostic()],
      );
      throw error;
    }

    this._startedModules = bootstrapContext.startedModules;
    this._moduleEnvelopes = bootstrapContext.moduleEnvelopes;
    this._platformRuntimeCatalog.replace(
      this._moduleEnvelopes,
      this._startedModules,
    );
    this._adminAssetCatalog.replace(
      this._startedModules.flatMap(
        (moduleEnvelope) => getAdminModuleAssets(moduleEnvelope)?.assets ?? [],
      ),
    );

    const startupReport = this._createStartupReport(
      policyMode,
      startupStartedAt,
      bootstrapContext,
    );

    if (startupReport.status === RuntimeStartupStatus.Failed) {
      this._reports = { ...this._reports, startup: startupReport };
      await this.stop();
      this._publishStartupReport(
        policyMode,
        startupStartedAt,
        bootstrapContext,
      );

      if (this._adapterLifecycleOrchestrator.startupFailure) {
        throw this._adapterLifecycleOrchestrator.startupFailure;
      }

      return;
    }

    try {
      await this._adapterLifecycleOrchestrator.startAdmin();
      await this._adapterLifecycleOrchestrator.startHttp();

      this._started = true;
      this._degraded = startupReport.degraded;

      this._publishStartupReport(
        policyMode,
        startupStartedAt,
        bootstrapContext,
      );
    } catch (error) {
      this._publishStartupReport(
        policyMode,
        startupStartedAt,
        bootstrapContext,
      );
      await this.stop();
      this._publishStartupReport(
        policyMode,
        startupStartedAt,
        bootstrapContext,
      );
      throw error;
    }
  }

  /**
   * Stops started modules in reverse order, disposes persistence and runtime
   * services, and records the shutdown report.
   */
  async stop(): Promise<void> {
    if (this._stopped) return;

    if (this._stoppingPromise) {
      return this._stoppingPromise;
    }

    const stoppingPromise = this._stop();
    this._stoppingPromise = stoppingPromise;

    try {
      await stoppingPromise;
    } finally {
      if (this._stoppingPromise === stoppingPromise) {
        this._stoppingPromise = null;
      }
    }
  }

  /** Writes a shutdown report after all best-effort cleanup is complete. */
  private async _stop(): Promise<void> {
    const shutdownStartedAt = dateNowIso();
    const cleanup = await this._cleanup();

    const shutdownReport = this._diagnosticsReporter.createShutdownReport({
      startedAt: shutdownStartedAt,
      correlationId: this._correlationId,
      stopOrder: cleanup.stopOrder,
      issues: cleanup.issues,
      adapters: this._adapterLifecycleOrchestrator.diagnostics,
    });

    this._reports = { ...this._reports, shutdown: shutdownReport };
  }

  /**
   * Writes the probing rebuild marker consumed by the next copy stage.
   */
  async invalidateProbingFolder(): Promise<void> {
    const normalizedProbingPath = normalize(this._config.platform.probingPath);

    if (!existsSync(normalizedProbingPath)) {
      await mkdir(normalizedProbingPath, { recursive: true });
    }

    const markerPath = join(normalizedProbingPath, REBUILD_MARKER_FILE_NAME);

    await writeFile(markerPath, '');
  }

  private _createCorrelationId(seed?: string): string {
    if (seed && seed.trim()) {
      return seed;
    }

    return `rt-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  private _publishStartupReport(
    policyMode: PlatformStartupPolicyType,
    startedAt: string,
    bootstrapContext:
      Awaited<ReturnType<IBootstrapCoordinator['coordinate']>> | undefined,
    additionalFailures: readonly IRuntimeFailureDiagnostic[] = [],
  ): void {
    this._reports = {
      ...this._reports,
      startup: this._createStartupReport(
        policyMode,
        startedAt,
        bootstrapContext,
        additionalFailures,
      ),
    };
  }

  private _createStartupReport(
    policyMode: PlatformStartupPolicyType,
    startedAt: string,
    bootstrapContext:
      Awaited<ReturnType<IBootstrapCoordinator['coordinate']>> | undefined,
    additionalFailures: readonly IRuntimeFailureDiagnostic[] = [],
  ): IRuntimeStartupReport {
    const failedModules = [
      ...(bootstrapContext?.failedDiagnostics ?? []),
      ...additionalFailures,
    ];
    const failedDiagnosticsByModuleId = new Map(
      failedModules.map((diagnostic) => [diagnostic.moduleId, diagnostic]),
    );

    return this._diagnosticsReporter.createStartupReport({
      policyMode,
      startedAt,
      correlationId: this._correlationId,
      failedModules,
      loadedModules: (bootstrapContext?.loadedModules ?? []).map(
        (moduleEnvelope) => ({
          moduleId: moduleEnvelope.id,
          version: moduleEnvelope.version,
        }),
      ),
      skippedModules: (bootstrapContext?.skippedModuleIds ?? []).map(
        (moduleId) => {
          const reason = failedDiagnosticsByModuleId.get(moduleId);
          assert(reason, `Failed diagnostic for module ${moduleId} not found.`);
          return { moduleId, reason };
        },
      ),
      hasFatalFailure: bootstrapContext?.aborted ?? false,
      adapters: this._adapterLifecycleOrchestrator.diagnostics,
    });
  }

  private _createStartupFailureDiagnostic(): IRuntimeFailureDiagnostic {
    return {
      moduleId: 'platform',
      phase: RuntimeStage.Lifecycle,
      errorCode: RuntimeErrorCodes.StartupFailed,
      message: 'Platform startup failed.',
      remediationHint: 'Inspect platform startup diagnostics.',
    };
  }

  /**
   * Stops every initialized runtime resource without allowing one failure to
   * prevent later cleanup. The caller turns the sanitized results into a report.
   */
  private async _cleanup(): Promise<{
    readonly issues: readonly IModuleLifecycleShutdownIssue[];
    readonly stopOrder: readonly string[];
  }> {
    const issues: IModuleLifecycleShutdownIssue[] = [];
    let stopOrder: readonly string[] = [];

    this._stopping = true;

    try {
      await this._stopAdapter(
        () => this._adapterLifecycleOrchestrator.stopHttp(),
        this._options.adapters.http.id,
        issues,
      );
      await this._stopAdapter(
        () => this._adapterLifecycleOrchestrator.stopAdmin(),
        this._options.adapters.admin.id,
        issues,
      );

      try {
        const shutdownResult =
          await this._moduleLifecycleOrchestrator.stopModules(
            this._startedModules,
            {
              startupPolicy: this._startupPolicy,
              sdkVersion:
                this._options.runtimeVersion?.sdkVersion ??
                SDK_CONTRACT_VERSION,
              timeoutMs: this._config.runtime.shutdownTimeoutMs,
              persistenceAdapter: this._options.adapters.persistence,
              persistenceState: 'ready',
            },
          );
        stopOrder = shutdownResult.stopOrder;
        issues.push(...shutdownResult.issues);
      } catch {
        issues.push({
          moduleId: 'platform',
          phase: RuntimeStage.Shutdown,
          errorCode: RuntimeErrorCodes.ShutdownFailed,
          message: 'Module shutdown orchestration failed.',
          remediationHint: 'Inspect module shutdown diagnostics.',
        });
      }

      await this._stopAdapter(
        () => this._adapterLifecycleOrchestrator.stopPersistence(),
        this._options.adapters.persistence.id,
        issues,
      );

      await this._stopApplicationServices(issues);

      return { issues, stopOrder };
    } finally {
      this._platformRuntimeCatalog.replace(this._moduleEnvelopes, []);
      this._adminAssetCatalog.replace([]);
      this._startedModules = [];
      this._stopped = true;
      this._started = false;
      this._stopping = false;
    }
  }

  private async _stopApplicationServices(
    issues: IModuleLifecycleShutdownIssue[],
  ): Promise<void> {
    if (this._applicationServicesStopped) return;

    this._applicationServicesStopped = true;

    try {
      await this._options.onStopped?.();
    } catch {
      issues.push({
        moduleId: 'platform',
        phase: RuntimeStage.Shutdown,
        errorCode: RuntimeErrorCodes.ShutdownFailed,
        message: 'Runtime service cleanup failed.',
        remediationHint: 'Inspect runtime service cleanup diagnostics.',
      });
    }
  }

  private async _stopAdapter(
    stop: () => Promise<void>,
    adapterId: string,
    issues: IModuleLifecycleShutdownIssue[],
  ): Promise<void> {
    try {
      await stop();
    } catch {
      issues.push({
        moduleId: adapterId,
        phase: RuntimeStage.Shutdown,
        errorCode: RuntimeErrorCodes.ShutdownFailed,
        message: `Runtime adapter "${adapterId}" stop failed.`,
        remediationHint: 'Inspect adapter shutdown diagnostics.',
      });
    }
  }
}
