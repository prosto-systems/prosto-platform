import type { PlatformModuleLifecycleStageType } from '@prosto/platform-sdk';
import type {
  IModuleContextFactory,
  IModuleEnvelope,
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
    loadedModules: readonly IModuleEnvelope[],
    options: IModuleLifecycleStartupOptions,
  ): Promise<IModulesStartupResult> {
    const startedModules: IModuleEnvelope[] = [];
    const issues: IModuleLifecycleExecutionIssue[] = [];

    for (const moduleEnvelope of loadedModules) {
      const failedStage: ModuleStartupStagesType | null =
        await this.runModuleStartup(moduleEnvelope, {
          startupPolicy: options.startupPolicy,
          sdkVersion: options.sdkVersion,
        });

      if (failedStage) {
        issues.push(
          this.createStartupIssue(moduleEnvelope.manifest.id, failedStage),
        );
        continue;
      }

      startedModules.push(moduleEnvelope);
    }

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
    const stopModules = [...startedModules].reverse();
    const issues: IModuleLifecycleShutdownIssue[] = [];

    for (const moduleEnvelope of stopModules) {
      const moduleId = moduleEnvelope.manifest.id;

      try {
        await executeWithTimeout(
          this.executeModuleStage(moduleEnvelope, 'stop', {
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

  private async runModuleStartup(
    moduleEnvelope: IModuleEnvelope,
    lifecycleContext: IModuleLifecycleContext,
  ): Promise<ModuleStartupStagesType | null> {
    const startupStageTypes: ModuleStartupStagesType[] = [
      /* 1 */ 'init',
      /* 2 */ 'start',
    ];

    for (const stageType of startupStageTypes) {
      try {
        await this.executeModuleStage(
          moduleEnvelope,
          stageType,
          lifecycleContext,
        );
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
