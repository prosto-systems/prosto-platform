import type { IModuleValidationStrategy } from '@/modularity/index.js';
import { PLATFORM_ADMIN_COMPONENT_ID } from '@prosto/platform-sdk/platform';
import { RuntimeErrorCodes } from '@/common/index.js';
import { type IBootstrapStageContext } from '../interfaces/index.js';
import { BootstrapStage } from '../constants/index.js';
import { BootstrapBaseStage } from './bootstrap.base-stage.js';

/**
 * @alpha
 * Runs the configured validation strategies for every discovered manifest.
 *
 * The default runtime composition validates the manifest schema and its SDK
 * and Node.js compatibility ranges. Validation stops at the first failed
 * strategy for each module while remaining candidates continue.
 */
export class ValidateStage extends BootstrapBaseStage {
  readonly stageType = BootstrapStage.Validate;

  constructor(
    private readonly _validationStrategies: IModuleValidationStrategy[],
  ) {
    super();
  }

  override async execute(
    context: IBootstrapStageContext,
  ): Promise<IBootstrapStageContext> {
    const candidateArtifacts = context.candidates;

    if (!candidateArtifacts.length) {
      this.addOutcome(context, { ok: false, details: 'No candidates' });
      return context;
    }

    const reservedAdminArtifact = candidateArtifacts.find(
      (artifact) => artifact.moduleId === PLATFORM_ADMIN_COMPONENT_ID,
    );

    if (reservedAdminArtifact) {
      this.skipModule(context, reservedAdminArtifact.moduleId);
      this.addFailure(context, {
        moduleId: reservedAdminArtifact.moduleId,
        errorCode: RuntimeErrorCodes.ManifestInvalid,
        message: `Module ID "${PLATFORM_ADMIN_COMPONENT_ID}" is reserved for the required admin adapter.`,
        remediationHint:
          'Remove the discoverable admin module and compose the admin adapter in RuntimeBuilder.',
      });
      this.addOutcome(context, {
        ok: false,
        details: `Reserved runtime component ID "${PLATFORM_ADMIN_COMPONENT_ID}" was discovered.`,
      });
      this.stopPipeline(context);
      return context;
    }

    candidates: for (const artifact of candidateArtifacts) {
      // Skip pre-rejected modules
      if (context.skippedModuleIds.has(artifact.moduleId)) {
        continue;
      }

      for (const validationStrategy of this._validationStrategies) {
        const validationResult = validationStrategy.validate({
          artifact,
          runtimeVersion: context.runtimeVersion,
        });

        if ('error' in validationResult) {
          this.skipModule(context, artifact.moduleId);
          this.addFailure(context, {
            ...validationResult.error,
            moduleId: artifact.moduleId,
          });

          continue candidates;
        }
      }

      this.addValidatedModule(context, artifact.moduleEnvelope);
    }

    const validateFailuresCount = context.failedDiagnostics.filter(
      (item) => item.phase === this.stageType,
    ).length;

    this.addOutcome(context, {
      ok: validateFailuresCount === 0,
      details: `${context.validatedModules.length}/${candidateArtifacts.length} modules validated`,
    });

    return context;
  }
}
