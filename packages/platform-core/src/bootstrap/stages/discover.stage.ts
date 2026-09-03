import { glob } from 'glob';
import { stat } from 'node:fs/promises';
import { basename, dirname, normalize } from 'node:path';
import type { IBootstrapStageContext } from '../interfaces/index.js';
import { BootstrapStage } from '../constants/index.js';
import { BootstrapBaseStage } from './bootstrap.base-stage.js';
import {
  DynamicModuleLoader,
  type IModuleCandidateArtifact,
  PlatformModuleEnvelope,
} from '@/modularity/index.js';
import { RuntimeErrorCodes } from '@/common/index.js';

/**
 * @alpha
 */
export class DiscoverStage extends BootstrapBaseStage {
  readonly stageType = BootstrapStage.Discover;

  constructor(private readonly _discoveryPath: string) {
    super();
  }

  override async execute(
    context: IBootstrapStageContext,
  ): Promise<IBootstrapStageContext> {
    const normalizedDiscoveryPath = normalize(this._discoveryPath);

    try {
      await stat(normalizedDiscoveryPath);
    } catch {
      this.addOutcome(context, {
        ok: false,
        details: `Discovery path not found: ${normalizedDiscoveryPath}`,
      });

      this.stopPipeline(context);

      return context;
    }

    const candidates: IModuleCandidateArtifact[] = [];
    const manifestFilePaths: string[] = await glob('**/manifest.json', {
      cwd: normalizedDiscoveryPath,
      ignore: ['**/artifacts/**'],
      absolute: true,
      follow: true,
    });

    for (const manifestFilePath of manifestFilePaths) {
      try {
        candidates.push(await this._readManifest(manifestFilePath));
      } catch (error) {
        const moduleId = basename(dirname(manifestFilePath));

        this.skipModule(context, moduleId);
        this.addFailure(context, {
          moduleId: moduleId,
          errorCode: RuntimeErrorCodes.LoadManifestFiled,
          message: error instanceof Error ? error.message : String(error),
          remediationHint: 'Check the structure of the module manifest.',
        });
      }
    }

    const discoveryFailuresCount = context.failedDiagnostics.filter(
      (item) => item.phase === this.stageType,
    ).length;

    this.addOutcome(context, {
      ok: discoveryFailuresCount === 0,
      details:
        discoveryFailuresCount > 0
          ? `${discoveryFailuresCount} modules rejected during discover stage`
          : undefined,
    });

    return { ...context, candidates };
  }

  private async _readManifest(
    manifestFilePath: string,
  ): Promise<IModuleCandidateArtifact> {
    const manifest =
      await DynamicModuleLoader.loadModuleManifest(manifestFilePath);

    const moduleEnvelope = new PlatformModuleEnvelope(manifest);

    moduleEnvelope.fullPhysicalPath = dirname(manifestFilePath);
    moduleEnvelope.isInstalled = true;

    return {
      moduleEnvelope,
      moduleId: manifest.id,
      moduleVersion: manifest.version,
    };
  }
}
