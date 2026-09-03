import type { PlatformModuleEnvelope } from '@/modularity/index.js';
import { DynamicModuleLoader, ModuleState } from '@/modularity/index.js';
import type { IBootstrapStageContext } from '../interfaces/index.js';
import { join } from 'node:path';
import { RuntimeErrorCodes } from '@/common/index.js';
import { BootstrapStage } from '../constants/index.js';
import { BootstrapBaseStage } from './bootstrap.base-stage.js';

/**
 * @alpha
 */
export class LoadStage extends BootstrapBaseStage {
  readonly stageType = BootstrapStage.Load;

  constructor(private readonly _probingPath: string) {
    super();
  }

  override async execute(
    context: IBootstrapStageContext,
  ): Promise<IBootstrapStageContext> {
    const validatedModules = context.validatedModules;

    if (!validatedModules.length) {
      this.addOutcome(context, { ok: false, details: 'No modules' });
      return context;
    }

    const loadedModules: PlatformModuleEnvelope[] = [];

    for (const moduleEnvelope of validatedModules) {
      // Skip pre-rejected modules
      if (context.skippedModuleIds.has(moduleEnvelope.id)) {
        continue;
      }

      try {
        loadedModules.push(await this._loadModule(moduleEnvelope));
      } catch (error) {
        const moduleId = moduleEnvelope.id;

        this.skipModule(context, moduleId);
        this.addFailure(context, {
          moduleId: moduleId,
          errorCode: RuntimeErrorCodes.LoadModuleInstanceFailed,
          message: error instanceof Error ? error.message : String(error),
          remediationHint: "Check that the module's structure is correct.",
        });
      }
    }

    const discoveryFailuresCount = context.failedDiagnostics.filter(
      (item) => item.phase === this.stageType,
    ).length;

    this.addOutcome(context, {
      ok: discoveryFailuresCount === 0,
      details: `${loadedModules.length}/${validatedModules.length} modules loaded`,
    });

    return { ...context, loadedModules };
  }

  private async _loadModule(
    moduleEnvelope: PlatformModuleEnvelope,
  ): Promise<PlatformModuleEnvelope> {
    const targetPath = join(this._probingPath, moduleEnvelope.id);
    const entryPath =
      await DynamicModuleLoader.resolvePlatformModuleEntryPath(targetPath);

    moduleEnvelope.moduleInstance =
      await DynamicModuleLoader.loadModuleEntry(entryPath);

    moduleEnvelope.ref = targetPath;
    moduleEnvelope.state = ModuleState.ReadyForInitialization;

    return moduleEnvelope;
  }
}
