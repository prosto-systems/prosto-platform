import type {
  IPlatformModule,
  ModuleLifecycleStageType,
} from '@prosto/platform-sdk';
import type { IModuleContextFactory } from '@/context/index.js';
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
import { executeWithTimeout } from '@/common/index.js';
import { RuntimeReasonCodes, RuntimeStage } from '@/runtime/index.js';
import { ShutdownTimeoutError } from './module-lifecycle.errors.js';

/**
 * @alpha
 * Lifecycle orchestrator for managing module startup and shutdown.
 */
export class ModuleLifecycleOrchestrator implements IModuleLifecycleOrchestrator {
  constructor(
    private readonly _moduleContextFactory: IModuleContextFactory,
  ) {
  }

  /**
   * Run the startup lifecycle for all modules.
   * Executes register -> init -> start stages in order.
   */
  async startup(
    loadedModules: readonly IPlatformModule[],
    options: IModuleLifecycleStartupOptions,
  ): Promise<IModulesStartupResult> {
    const startedModules: IPlatformModule[] = [];
    const issues: IModuleLifecycleExecutionIssue[] = [];

    for (const module of loadedModules) {
      const failedStage: ModuleStartupStagesType | null =
        await this.runModuleStartup(module, {
          startupPolicy: options.startupPolicy,
          sdkVersion: options.sdkVersion,
        });

      if (failedStage) {
        issues.push(this.createStartupIssue(module.manifest.id, failedStage));
        continue;
      }

      startedModules.push(module);
    }

    return { startedModules, issues };
  }

  /**
   * Run the shutdown lifecycle for all started modules.
   * Executes stop stage in reverse order with timeout.
   */
  async shutdown(
    startedModules: readonly IPlatformModule[],
    options: IModuleLifecycleShutdownOptions,
  ): Promise<IModulesShutdownResult> {
    const stopModules = [...startedModules].reverse();
    const issues: IModuleLifecycleShutdownIssue[] = [];

    for (const module of stopModules) {
      const moduleId = module.manifest.id;

      try {
        await executeWithTimeout(
          this.executeModuleStage(module, 'stop', {
            startupPolicy: options.startupPolicy,
            sdkVersion: options.sdkVersion,
          }),
          options.timeoutMs,
          () => new ShutdownTimeoutError(moduleId, options.timeoutMs),
        );
      } catch (error) {
        const isTimeoutError = error instanceof ShutdownTimeoutError;

        issues.push({
          moduleId,
          phase: RuntimeStage.Shutdown,
          errorCode: isTimeoutError
            ? RuntimeReasonCodes.ShutdownTimeout
            : RuntimeReasonCodes.ShutdownFailed,
          message: error instanceof Error ? error.message : 'Unknown shutdown error.',
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

  private async executeModuleStage(
    module: IPlatformModule,
    stage: ModuleLifecycleStageType,
    lifecycleContext: IModuleLifecycleContext,
  ): Promise<void> {
    const context = this._moduleContextFactory.create({
      startupPolicy: lifecycleContext.startupPolicy,
      sdkVersion: lifecycleContext.sdkVersion,
      moduleManifest: module.manifest,
    });

    await module[stage](context);
  }

  private async runModuleStartup(
    module: IPlatformModule,
    lifecycleContext: IModuleLifecycleContext,
  ): Promise<ModuleStartupStagesType | null> {
    const startupStageTypes: ModuleStartupStagesType[] = [
      /* 1 */ 'register',
      /* 2 */ 'init',
      /* 3 */ 'start',
    ];

    for (const stageType of startupStageTypes) {
      try {
        await this.executeModuleStage(module, stageType, lifecycleContext);
      } catch {
        return /* failure */ stageType;
      }
    }

    return /* success */ null;
  }

  private createStartupIssue(
    moduleId: string,
    stage: ModuleStartupStagesType,
  ): IModuleLifecycleExecutionIssue {
    const reasonCodeMap: Record<ModuleStartupStagesType, RuntimeReasonCodes> = {
      register: RuntimeReasonCodes.LifecycleRegisterFailed,
      init: RuntimeReasonCodes.LifecycleInitFailed,
      start: RuntimeReasonCodes.LifecycleStartFailed,
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
