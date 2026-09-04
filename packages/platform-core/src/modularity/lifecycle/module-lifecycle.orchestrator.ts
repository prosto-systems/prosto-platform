import type {
  IHttpEndpointRegistrarProvider,
  PlatformModuleLifecycleStageType,
} from '@prosto/platform-sdk';
import { HttpEndpointRegistrationError } from '@prosto/platform-sdk';
import type { PlatformModuleEnvelope } from '@/modularity/index.js';
import { type IModuleContextFactory, ModuleState } from '@/modularity/index.js';
import type {
  IModuleLifecycleContext,
  IModuleLifecycleExecutionIssue,
  IModuleLifecycleOrchestrator,
  IModuleLifecycleShutdownIssue,
  IModuleLifecycleShutdownOptions,
  IModuleLifecycleStartupOptions,
  IModulesInitializationResult,
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
 * Executes lifecycle hooks on loaded module envelopes.
 *
 * Initialization and startup preserve dependency order. Shutdown reverses the
 * successful startup order and applies the configured per-module timeout.
 */
export class ModuleLifecycleOrchestrator implements IModuleLifecycleOrchestrator {
  constructor(
    private readonly _moduleContextFactory: IModuleContextFactory,
    private readonly _httpEndpointRegistrarProvider?: IHttpEndpointRegistrarProvider,
  ) {}

  /**
   * Runs `init()` for each loaded module and rolls back persistence descriptors
   * registered by a module whose initialization fails.
   */
  async initializeModules(
    loadedModules: readonly PlatformModuleEnvelope[],
    options: IModuleLifecycleStartupOptions,
  ): Promise<IModulesInitializationResult> {
    const lifecycleContext = this._createLifecycleContext(options);
    const initializedModules: PlatformModuleEnvelope[] = [];
    const issues: IModuleLifecycleExecutionIssue[] = [];

    for (const moduleEnvelope of loadedModules) {
      moduleEnvelope.state = ModuleState.Initializing;

      try {
        await this._executeModuleStage(
          moduleEnvelope,
          'init',
          lifecycleContext,
        );

        this._httpEndpointRegistrarProvider?.commit(moduleEnvelope.id);

        moduleEnvelope.state = ModuleState.Initialized;
      } catch (error) {
        moduleEnvelope.state = ModuleState.NotInitialized;

        lifecycleContext.persistenceProvider?.descriptors.rollback(
          moduleEnvelope.id,
        );
        this._httpEndpointRegistrarProvider?.rollback(moduleEnvelope.id);

        issues.push(this._createStartupIssue(moduleEnvelope.id, 'init', error));

        continue;
      }

      initializedModules.push(moduleEnvelope);
    }

    return { initializedModules, issues };
  }

  /**
   * Runs `start()` for each successfully initialized module.
   */
  async startModules(
    initializedModules: readonly PlatformModuleEnvelope[],
    options: IModuleLifecycleStartupOptions,
  ): Promise<IModulesStartupResult> {
    const lifecycleContext = this._createLifecycleContext(options);
    const startedModules: PlatformModuleEnvelope[] = [];
    const issues: IModuleLifecycleExecutionIssue[] = [];

    for (const moduleEnvelope of initializedModules) {
      moduleEnvelope.state = ModuleState.Starting;

      try {
        await this._executeModuleStage(
          moduleEnvelope,
          'start',
          lifecycleContext,
        );

        moduleEnvelope.state = ModuleState.Started;
      } catch (error) {
        moduleEnvelope.state = ModuleState.NotStarted;

        this._httpEndpointRegistrarProvider?.rollback(moduleEnvelope.id);

        issues.push(
          this._createStartupIssue(moduleEnvelope.id, 'start', error),
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
  async stopModules(
    startedModules: readonly PlatformModuleEnvelope[],
    options: IModuleLifecycleShutdownOptions,
  ): Promise<IModulesShutdownResult> {
    const lifecycleContext: IModuleLifecycleContext = {
      startupPolicy: options.startupPolicy,
      sdkVersion: options.sdkVersion,
      persistenceEnabled: false,
    };
    const stopModules = [...startedModules].reverse();
    const issues: IModuleLifecycleShutdownIssue[] = [];

    for (const moduleEnvelope of stopModules) {
      const moduleId = moduleEnvelope.id;

      try {
        await executeWithTimeout(
          this._executeModuleStage(moduleEnvelope, 'stop', lifecycleContext),
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
      stopOrder: stopModules.map((module) => module.id),
    };
  }

  private _createLifecycleContext(
    options: IModuleLifecycleStartupOptions,
  ): IModuleLifecycleContext {
    return {
      startupPolicy: options.startupPolicy,
      sdkVersion: options.sdkVersion,
      persistenceProvider: options.persistenceProvider,
      persistenceEnabled: options.persistenceEnabled ?? false,
    };
  }

  private async _executeModuleStage(
    moduleEnvelope: PlatformModuleEnvelope,
    stage: PlatformModuleLifecycleStageType,
    lifecycleContext: IModuleLifecycleContext,
  ): Promise<void> {
    if (!moduleEnvelope.moduleInstance) {
      throw new Error('Module instance not found');
    }

    const context = this._moduleContextFactory.create({
      lifecycleStage: stage,
      moduleManifest: moduleEnvelope.toManifest(),
      startupPolicy: lifecycleContext.startupPolicy,
      sdkVersion: lifecycleContext.sdkVersion,
      persistenceProvider: lifecycleContext.persistenceProvider,
      persistenceEnabled: lifecycleContext.persistenceEnabled,
    });

    await moduleEnvelope.moduleInstance[stage](context);
  }

  private _createStartupIssue(
    moduleId: string,
    stage: ModuleStartupStagesType,
    error: unknown,
  ): IModuleLifecycleExecutionIssue {
    if (error instanceof HttpEndpointRegistrationError) {
      const remediationHint = error.details?.remediationHint;

      return {
        moduleId,
        phase: RuntimeStage.Lifecycle,
        lifecycleStage: stage,
        errorCode: RuntimeErrorCodes.HttpEndpointRegistrationFailed,
        message: error.message,
        remediationHint:
          typeof remediationHint === 'string' && remediationHint.length > 0
            ? remediationHint
            : `Correct HTTP endpoint declarations for module "${moduleId}" during init().`,
      };
    }

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
