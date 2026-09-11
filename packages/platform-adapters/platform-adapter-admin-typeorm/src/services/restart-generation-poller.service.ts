import type {
  IHostRestartCapability,
  IPlatformRuntimeAdapterLogger,
} from '@prosto/platform-sdk/platform';
import type { DataSource } from 'typeorm';
import { AdminPersistenceRepository } from './admin-persistence.repository.js';

/** @internal Polls distributed restart generations and requests local shutdown once. */
export class RestartGenerationPoller {
  private _interval: NodeJS.Timeout | undefined;
  private _observedGeneration: number | undefined;
  private _inFlight: Promise<void> | undefined;

  constructor(
    private readonly _repository: AdminPersistenceRepository,
    private readonly _restartCapability: IHostRestartCapability,
    private readonly _intervalMilliseconds: number,
    private readonly _logger: IPlatformRuntimeAdapterLogger,
  ) {}

  static create(
    dataSource: DataSource,
    restartCapability: IHostRestartCapability,
    intervalSeconds: number,
    logger: IPlatformRuntimeAdapterLogger,
  ): RestartGenerationPoller {
    return new RestartGenerationPoller(
      new AdminPersistenceRepository(dataSource),
      restartCapability,
      intervalSeconds * 1_000,
      logger,
    );
  }

  async start(): Promise<void> {
    // A replacement process adopts the current generation rather than looping.
    this._observedGeneration = await this._repository.getRestartGeneration();
    this._interval = setInterval(() => {
      void this._poll();
    }, this._intervalMilliseconds);
  }

  async stop(): Promise<void> {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }

    await this._inFlight;
  }

  private _poll(): Promise<void> {
    if (this._inFlight) {
      return this._inFlight;
    }

    this._inFlight = this._pollGeneration().finally(() => {
      this._inFlight = undefined;
    });
    return this._inFlight;
  }

  private async _pollGeneration(): Promise<void> {
    if (this._observedGeneration === undefined) {
      return;
    }

    try {
      const generation = await this._repository.getRestartGeneration();

      if (
        this._observedGeneration !== undefined &&
        generation > this._observedGeneration
      ) {
        this._observedGeneration = generation;
        await this._restartCapability.requestGracefulShutdown();
      }
    } catch {
      this._logger.error('platform-admin restart generation poll failed.');
    }
  }
}
