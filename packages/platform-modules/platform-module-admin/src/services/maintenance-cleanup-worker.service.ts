import type { IPlatformModuleLogger } from '@prosto/platform-sdk/platform';
import type { AdminPersistenceRepository } from './admin-persistence.repository.js';

/** @internal Periodically deletes expired, security-sensitive ephemeral records. */
export class MaintenanceCleanupWorker {
  private _interval: NodeJS.Timeout | undefined;

  constructor(
    private readonly _repository: AdminPersistenceRepository,
    private readonly _logger: IPlatformModuleLogger,
  ) {}

  start(): void {
    this._interval = setInterval(
      () => {
        void this._cleanup();
      },
      60 * 60 * 1_000,
    );
  }

  stop(): void {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private async _cleanup(): Promise<void> {
    try {
      await this._repository.removeExpiredRecords(new Date().toISOString());
    } catch {
      this._logger.error('platform-admin expired-record cleanup failed.');
    }
  }
}
