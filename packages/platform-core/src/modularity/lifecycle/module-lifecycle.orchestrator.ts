import type { PlatformModuleLifecycleStageType } from '@prosto/platform-sdk';
import {
  type IModuleContextFactory,
  type IModuleEnvelope,
  ModuleState,
} from '@/modularity/index.js';
import type {
  IModuleLifecycleContext,
  IModuleLifecycleExecutionIssue,
  IModuleLifecycleOrchestrator,
  IModuleLifecycleShutdownIssue,
  IModuleLifecycleShutdownOptions,
  IModuleLifecycleStartupOptions,
  IModulesShutdownResult,
  IModulesStartupResult,
  ModuleStartupStagesType,
} from './interfaces/index.js';
import {
  executeWithTimeout,
  RuntimeErrorCodes,
  RuntimeStage,
} from '@/common/index.js';
import { ShutdownTimeoutError } from './module-lifecycle.errors.js';

/**
 * @alpha
 * Lifecycle orchestrator for managing module startup and shutdown.
 */
export class ModuleLifecycleOrchestrator implements IModuleLifecycleOrchestrator {
  constructor(private readonly _moduleContextFactory: IModuleContextFactory) {}

  /**
   * Run the startup lifecycle for all modules.
   * Executes register -> init -> start stages in order.
   */
  async startup(
    loadedModules: IModuleEnvelope[],
    options: IModuleLifecycleStartupOptions,
  ): Promise<IModulesStartupResult> {
    const lifecycleContext: IModuleLifecycleContext = {
      startupPolicy: options.startupPolicy,
      sdkVersion: options.sdkVersion,
    };
    const issues: IModuleLifecycleExecutionIssue[] = [];

    // Initialize modules
    const { initializedModules, initializeIssues } =
      await this.initializeModules(loadedModules, lifecycleContext);

    issues.push(...initializeIssues);

    // Start modules
    const { startedModules, startIssues } = await this.startModules(
      initializedModules,
      lifecycleContext,
    );

    issues.push(...startIssues);

    return { startedModules, issues };
  }

  /**
   * Run the shutdown lifecycle for all started modules.
   * Executes stop stage in reverse order with timeout.
   */
  async shutdown(
    startedModules: readonly IModuleEnvelope[],
    options: IModuleLifecycleShutdownOptions,
  ): Promise<IModulesShutdownResult> {
    const lifecycleContext: IModuleLifecycleContext = {
      startupPolicy: options.startupPolicy,
      sdkVersion: options.sdkVersion,
    };
    const stopModules = [...startedModules].reverse();
    const issues: IModuleLifecycleShutdownIssue[] = [];

    for (const moduleEnvelope of stopModules) {
      const moduleId = moduleEnvelope.manifest.id;

      try {
        await executeWithTimeout(
          this.executeModuleStage(moduleEnvelope, 'stop', lifecycleContext),
          options.timeoutMs,
          () => new ShutdownTimeoutError(moduleId, options.timeoutMs),
        );
      } catch (error) {
        const isTimeoutError = error instanceof ShutdownTimeoutError;

        issues.push({
          moduleId,
          phase: RuntimeStage.Shutdown,
          errorCode: isTimeoutError
            ? RuntimeErrorCodes.ShutdownTimeout
            : RuntimeErrorCodes.ShutdownFailed,
          message:
            error instanceof Error ? error.message : 'Unknown shutdown error.',
          remediationHint: isTimeoutError
            ? `Ensure module "${moduleId}" stop() resolves before timeout.`
            : `Inspect module "${moduleId}" stop() implementation and dependencies.`,
        });
      }
    }

    return {
      issues,
      stopOrder: stopModules.map((module) => module.manifest.id),
    };
  }

  private async initializeModules(
    moduleEnvelopes: IModuleEnvelope[],
    lifecycleContext: IModuleLifecycleContext,
  ): Promise<{
    initializedModules: IModuleEnvelope[];
    initializeIssues: IModuleLifecycleExecutionIssue[];
  }> {
    const initializedModules: IModuleEnvelope[] = [];
    const initializeIssues: IModuleLifecycleExecutionIssue[] = [];

    for (const moduleEnvelope of moduleEnvelopes) {
      moduleEnvelope.state = ModuleState.Initializing;

      try {
        await this.executeModuleStage(moduleEnvelope, 'init', lifecycleContext);

        moduleEnvelope.state = ModuleState.Initialized;
      } catch {
        moduleEnvelope.state = ModuleState.NotInitialized;

        initializeIssues.push(
          this.createStartupIssue(moduleEnvelope.manifest.id, 'init'),
        );

        continue;
      }

      initializedModules.push(moduleEnvelope);
    }

    return { initializedModules, initializeIssues };
  }

  private async startModules(
    moduleEnvelopes: IModuleEnvelope[],
    lifecycleContext: IModuleLifecycleContext,
  ): Promise<{
    startedModules: IModuleEnvelope[];
    startIssues: IModuleLifecycleExecutionIssue[];
  }> {
    const startedModules: IModuleEnvelope[] = [];
    const startIssues: IModuleLifecycleExecutionIssue[] = [];

    for (const moduleEnvelope of moduleEnvelopes) {
      moduleEnvelope.state = ModuleState.Starting;

      try {
        await this.executeModuleStage(
          moduleEnvelope,
          'start',
          lifecycleContext,
        );

        moduleEnvelope.state = ModuleState.Started;
      } catch {
        moduleEnvelope.state = ModuleState.NotStarted;

        startIssues.push(
          this.createStartupIssue(moduleEnvelope.manifest.id, 'start'),
        );

        continue;
      }

      startedModules.push(moduleEnvelope);
    }

    return { startedModules, startIssues };
  }

  private async executeModuleStage(
    moduleEnvelope: IModuleEnvelope,
    stage: PlatformModuleLifecycleStageType,
    lifecycleContext: IModuleLifecycleContext,
  ): Promise<void> {
    const context = this._moduleContextFactory.create({
      startupPolicy: lifecycleContext.startupPolicy,
      sdkVersion: lifecycleContext.sdkVersion,
      moduleManifest: moduleEnvelope.manifest,
    });

    await moduleEnvelope.module[stage](context);
  }

  private createStartupIssue(
    moduleId: string,
    stage: ModuleStartupStagesType,
  ): IModuleLifecycleExecutionIssue {
    const reasonCodeMap: Record<ModuleStartupStagesType, RuntimeErrorCodes> = {
      init: RuntimeErrorCodes.LifecycleInitFailed,
      start: RuntimeErrorCodes.LifecycleStartFailed,
    };

    return {
      moduleId,
      phase: RuntimeStage.Lifecycle,
      lifecycleStage: stage,
      errorCode: reasonCodeMap[stage],
      message: `Module failed during ${stage}.`,
      remediationHint: `Inspect module "${moduleId}" ${stage} implementation and runtime dependencies.`,
    };
  }
}
