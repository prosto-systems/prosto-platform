import { join, normalize } from 'node:path';
import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { REBUILD_MARKER_FILE_NAME, RuntimeErrorCodes } from '@/common/index.js';
import { type PlatformModuleEnvelope } from '@/modularity/index.js';
import type { IBootstrapStageContext } from '../interfaces/index.js';
import { BootstrapStage } from '../constants/index.js';
import { BootstrapBaseStage } from './bootstrap.base-stage.js';

/**
 * @alpha
 * Copies validated module builds into the runtime probing directory.
 *
 * The stage copies each package's `dist` directory and `package.json` when the
 * probing directory is new, startup refresh is enabled, or a rebuild marker is
 * present. A rebuild marker causes the complete probing directory to be
 * removed before it is repopulated.
 */
export class CopyStage extends BootstrapBaseStage {
  readonly stageType = BootstrapStage.Copy;

  constructor(
    private readonly _probingPath: string,
    private readonly _refreshProbingFolderOnStart: boolean,
  ) {
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

    const normalizedProbingPath = normalize(this._probingPath);
    const markerPath = join(normalizedProbingPath, REBUILD_MARKER_FILE_NAME);
    let refreshProbing = this._refreshProbingFolderOnStart;

    if (existsSync(markerPath)) {
      await rm(normalizedProbingPath, { recursive: true, force: true });
      refreshProbing = true;
    }

    if (!existsSync(normalizedProbingPath)) {
      await mkdir(normalizedProbingPath, { recursive: true });
      refreshProbing = true;
    }

    if (refreshProbing) {
      for (const moduleEnvelope of validatedModules) {
        // Skip pre-rejected modules
        if (context.skippedModuleIds.has(moduleEnvelope.id)) {
          continue;
        }

        const targetPath = join(normalizedProbingPath, moduleEnvelope.id);

        try {
          await this._copyModule(moduleEnvelope, targetPath);
        } catch (error) {
          const moduleId = moduleEnvelope.id;

          this.skipModule(context, moduleId);
          this.addFailure(context, {
            moduleId: moduleId,
            errorCode: RuntimeErrorCodes.CopyModuleFailed,
            message: error instanceof Error ? error.message : String(error),
            remediationHint: 'Rebuild the module.',
          });
        }
      }
    }

    const discoveryFailuresCount = context.failedDiagnostics.filter(
      (item) => item.phase === this.stageType,
    ).length;

    this.addOutcome(context, {
      ok: discoveryFailuresCount === 0,
      details:
        discoveryFailuresCount > 0
          ? `${discoveryFailuresCount} modules rejected during copy stage`
          : undefined,
    });

    return context;
  }

  private async _copyModule(
    moduleEnvelope: PlatformModuleEnvelope,
    targetDirectoryPath: string,
  ) {
    const sourcePath = join(moduleEnvelope.fullPhysicalPath, 'dist');
    const packagePath = join(moduleEnvelope.fullPhysicalPath, 'package.json');
    const targetSourcePath = join(targetDirectoryPath, 'dist');
    const targetPackagePath = join(targetDirectoryPath, 'package.json');

    if (!existsSync(sourcePath)) {
      throw new Error('Source directory does not exist');
    }

    if (!existsSync(packagePath)) {
      throw new Error('package.json file does not exist');
    }

    if (!existsSync(targetSourcePath)) {
      await mkdir(targetSourcePath, { recursive: true });
    }

    await cp(sourcePath, targetSourcePath, { recursive: true, force: true });
    await cp(packagePath, targetPackagePath, { force: true });
  }
}
