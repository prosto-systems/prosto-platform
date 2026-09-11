import type { AdapterLifecycleOrchestrator } from '@/runtime/adapters/index.js';
import type { IBootstrapStageContext } from '../interfaces/index.js';
import { BootstrapStage } from '../constants/index.js';
import { BootstrapBaseStage } from './bootstrap.base-stage.js';

/**
 * @alpha
 * Starts the required persistence adapter after module declarations are sealed.
 */
export class PersistenceInitializationStage extends BootstrapBaseStage {
  readonly stageType = BootstrapStage.Persistence;

  constructor(
    private readonly _adapterLifecycleOrchestrator: AdapterLifecycleOrchestrator,
  ) {
    super();
  }

  override async execute(
    context: IBootstrapStageContext,
  ): Promise<IBootstrapStageContext> {
    try {
      await this._adapterLifecycleOrchestrator.startPersistence();
    } catch (error) {
      this.fail(context, 'Persistence initialization failed.', error);
      return context;
    }

    this.addOutcome(context, {
      ok: true,
      details: 'Persistence adapter is ready.',
    });

    return context;
  }

  private fail(
    context: IBootstrapStageContext,
    message: string,
    error?: unknown,
  ): void {
    this.addFailure(context, {
      moduleId: 'platform',
      errorCode: 'PERSISTENCE_FAILED',
      message,
      remediationHint:
        error instanceof Error
          ? 'Inspect persistence adapter diagnostics.'
          : 'Inspect persistence adapter configuration.',
    });
    this.addOutcome(context, { ok: false, details: message });
    this.stopPipeline(context);
  }
}
