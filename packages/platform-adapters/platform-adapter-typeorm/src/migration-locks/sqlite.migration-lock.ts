import type { QueryRunner } from 'typeorm';
import { sleep } from '@/utils/index.js';
import { QueryRunnerBaseMigrationLock } from './base.migration-lock.js';

/**
 * @internal
 * SQLite migration lock using a non-blocking retry loop around
 * `BEGIN EXCLUSIVE`. In-memory databases bypass locking because they cannot
 * contend across processes.
 */
export class SqliteMigrationLock extends QueryRunnerBaseMigrationLock {
  private readonly POLL_INTERVAL_MS = 50;

  constructor(
    runner: QueryRunner,
    private readonly _isInMemory: boolean,
  ) {
    super(runner);
  }

  override async acquire(timeoutMs: number): Promise<void> {
    if (this._isInMemory) {
      // In-memory SQLite databases are process-local and cannot contend.
      this._acquired = true;
      return;
    }

    const deadline = Date.now() + timeoutMs;

    // better-sqlite3 is synchronous, so SQLite's native busy timeout would
    // block the event loop and prevent the lock holder from progressing.
    await this._runner.query('PRAGMA busy_timeout = 0');

    while (Date.now() <= deadline) {
      try {
        await this._runner.query('BEGIN EXCLUSIVE');

        this._acquired = true;
        return;
      } catch {
        await sleep(
          Math.min(this.POLL_INTERVAL_MS, Math.max(1, deadline - Date.now())),
        );
      }
    }

    throw this._timeout();
  }

  protected override async _releaseLock(): Promise<void> {
    if (!this._isInMemory) {
      await this._runner.query('COMMIT');
    }
  }
}
