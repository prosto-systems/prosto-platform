import type { IPlatformModuleManifest } from '@prosto/platform-sdk';
import type { IModuleLifecycleOrchestrator } from '@/lifecycle/index.js';
import type { IStartupPolicyEvaluator } from '@/policy/index.js';
import { type IBootstrapStageContext } from '../interfaces/index.js';
import { BootstrapStage } from '../constants/index.js';
import { BootstrapBaseStage } from './bootstrap.base-stage.js';

/**
 * @alpha
 * Bootstrap stage that executes the lifecycle stages (register, init, start) for modules.
 */
export class ModuleLifecycleStage extends BootstrapBaseStage {
  readonly stageType = BootstrapStage.Lifecycle;

  constructor(
    private readonly _startupPolicyEvaluator: IStartupPolicyEvaluator,
    private readonly _moduleLifecycleOrchestrator: IModuleLifecycleOrchestrator,
  ) {
    super();
  }

  override async execute(context: IBootstrapStageContext): Promise<IBootstrapStageContext> {
    const loadedModules = context.loadedModules;

    if (!loadedModules.length) {
      this.addOutcome(context, { ok: false, details: 'No modules to start' });
      return context;
    }

    const startupResult = await this._moduleLifecycleOrchestrator.startup(
      loadedModules,
      {
        startupPolicy: context.policyMode,
        sdkVersion: context.runtimeVersion.sdkVersion,
      },
    );

    const loadedModuleManifestsById = new Map<string, IPlatformModuleManifest>(
      startupResult.issues.length
        ? loadedModules.map((module) => [module.manifest.id, module.manifest])
        : [],
    );

    // Handle any issues that occurred during module startup and apply startup policy
    for (const issue of startupResult.issues) {
      const moduleId = issue.moduleId;

      this.skipModule(context, moduleId);
      this.addFailure(context, {
        moduleId,
        errorCode: issue.errorCode,
        message: issue.message,
        remediationHint: issue.remediationHint,
      });

      const moduleManifest = loadedModuleManifestsById.get(moduleId);
      const policy = this._startupPolicyEvaluator.evaluate({
        moduleId,
        policyMode: context.policyMode,
        critical: moduleManifest?.criticality === 'critical',
      });

      if (policy.action === 'abort') {
        this.addOutcome(context, { ok: false, details: policy.reason });
        this.stopPipeline(context);

        // Shutdown any started modules
        await this._moduleLifecycleOrchestrator.shutdown(startupResult.startedModules, {
          startupPolicy: context.policyMode,
          sdkVersion: context.runtimeVersion.sdkVersion,
          timeoutMs: 10000,
        });

        return { ...context, loadedModules: [] };
      }
    }

    this.addOutcome(context, {
      ok: true,
      details: 'Lifecycle orchestration delegated to runtime startup flow',
    });

    return { ...context, loadedModules: [...startupResult.startedModules] };
  }
}
