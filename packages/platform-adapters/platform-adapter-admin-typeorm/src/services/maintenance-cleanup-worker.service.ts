import type { IPlatformRuntimeAdapterLogger } from '@prosto/platform-sdk/platform';
import type { AdminPersistenceRepository } from './admin-persistence.repository.js';

/** @internal Periodically deletes expired, security-sensitive ephemeral records. */
export class MaintenanceCleanupWorker {
  private _interval: NodeJS.Timeout | undefined;
  private _inFlight: Promise<void> | undefined;

  constructor(
    private readonly _repository: AdminPersistenceRepository,
    private readonly _logger: IPlatformRuntimeAdapterLogger,
  ) {}

  start(): void {
    this._interval = setInterval(
      () => {
        void this._cleanup();
      },
      60 * 60 * 1_000,
    );
  }

  async stop(): Promise<void> {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }

    await this._inFlight;
  }

  private _cleanup(): Promise<void> {
    if (this._inFlight) {
      return this._inFlight;
    }

    this._inFlight = this._removeExpiredRecords().finally(() => {
      this._inFlight = undefined;
    });
    return this._inFlight;
  }

  private async _removeExpiredRecords(): Promise<void> {
    try {
      await this._repository.removeExpiredRecords(new Date().toISOString());
    } catch {
      this._logger.error('platform-admin expired-record cleanup failed.');
    }
  }
}
