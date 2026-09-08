import type { IRuntimeFailureDiagnostic } from '@/diagnostics/index.js';
import type {
  IBootstrapContext,
  IBootstrapCoordinator,
  IBootstrapInput,
  IBootstrapPipeline,
  IBootstrapStageContext,
} from './interfaces/index.js';
import { RuntimeErrorCodes, RuntimeStage } from '@/common/index.js';

/**
 * @alpha
 * Bootstrap coordinator that orchestrates the module bootstrap pipeline.
 */
export class BootstrapCoordinator implements IBootstrapCoordinator {
  constructor(private readonly _pipeline: IBootstrapPipeline) {}

  /**
   * Coordinate the bootstrap process for the given input.
   * @param input - Bootstrap coordinator input
   * @returns Bootstrap context with results
   */
  async coordinate(input: IBootstrapInput): Promise<IBootstrapContext> {
    const initialStageContext: IBootstrapStageContext = {
      abort: false,
      stageOutcomes: [],
      failedDiagnostics: [],
      candidates: [],
      validatedModules: [],
      loadedModules: [],
      skippedModuleIds: new Set<string>(),
      policyMode: input.policyMode,
      correlationId: input.correlationId,
      startupStartedAt: input.startupStartedAt,
      runtimeVersion: input.runtimeVersion,
      persistenceProvider: input.persistenceProvider,
      platformPersistenceDescriptor: input.platformPersistenceDescriptor,
      persistenceConfiguration: input.persistenceConfiguration ?? {
        typeorm: { enabled: false },
      },
      services: input.services,
    };

    const result = await this._pipeline.execute(initialStageContext);
    const failedDiagnostics = [...result.failedDiagnostics];

    if (result.abort) {
      let abortingStage: IRuntimeFailureDiagnostic['phase'] =
        RuntimeStage.Lifecycle;

      for (let index = result.stageOutcomes.length - 1; index >= 0; index--) {
        const outcome = result.stageOutcomes[index];

        if (outcome && !outcome.ok) {
          abortingStage = outcome.stage;
          break;
        }
      }

      const hasStageFailure = failedDiagnostics.some(
        (diagnostic) => diagnostic.phase === abortingStage,
      );

      if (!hasStageFailure) {
        failedDiagnostics.push({
          moduleId: 'platform',
          phase: abortingStage,
          errorCode: RuntimeErrorCodes.BootstrapAborted,
          message: 'Platform bootstrap aborted before completion.',
          remediationHint: 'Inspect the failed bootstrap stage outcome.',
        });
      }
    }

    return {
      policyMode: input.policyMode,
      loadedModules: result.abort ? [] : result.loadedModules,
      moduleEnvelopes: result.validatedModules,
      stageOutcomes: result.stageOutcomes,
      failedDiagnostics,
      skippedModuleIds: [...result.skippedModuleIds].sort((left, right) =>
        left.localeCompare(right),
      ),
    };
  }
}
