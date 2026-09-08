import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import {
  AdminMailOutboxEntity,
  AdminPasswordResetEntity,
  AdminRateLimitAttemptEntity,
  AdminSessionEntity,
  AdminStateEntity,
  AdminUserEntity,
} from '@/entities/index.js';
import { ADMIN_STATE_ID } from '@/constants/index.js';

/** @internal Shared persistence operations used by administration infrastructure. */
export class AdminPersistenceRepository {
  constructor(private readonly _dataSource: DataSource) {}

  async ensureState(): Promise<void> {
    const repository = this._dataSource.getRepository(AdminStateEntity);
    const existing = await repository.findOneBy({ id: ADMIN_STATE_ID });

    if (existing) {
      return;
    }

    try {
      await repository.insert({
        id: ADMIN_STATE_ID,
        maintenanceEnabled: false,
        restartGeneration: 0,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // A concurrent replica may have initialized the singleton first.
      if (!(await repository.findOneBy({ id: ADMIN_STATE_ID }))) {
        throw new Error(
          'Unable to initialize the shared platform-admin state.',
        );
      }
    }
  }

  async getState(): Promise<AdminStateEntity> {
    await this.ensureState();
    const state = await this._dataSource
      .getRepository(AdminStateEntity)
      .findOneBy({ id: ADMIN_STATE_ID });

    if (!state) {
      throw new Error('Shared platform-admin state is unavailable.');
    }

    return state;
  }

  async createBootstrapAdmin(input: {
    readonly displayName: string;
    readonly email: string;
    readonly passwordHash: string;
  }): Promise<void> {
    const repository = this._dataSource.getRepository(AdminUserEntity);

    if ((await repository.count()) > 0) {
      return;
    }

    const now = new Date().toISOString();
    const normalizedEmail = input.email.trim().toLowerCase();

    try {
      await repository.insert({
        id: randomUUID(),
        email: input.email.trim(),
        normalizedEmail,
        displayName: input.displayName.trim(),
        passwordHash: input.passwordHash,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // The normalized-email unique constraint resolves concurrent bootstrap.
      if ((await repository.count()) === 0) {
        throw new Error('Unable to create the initial platform administrator.');
      }
    }
  }

  async hasUsers(): Promise<boolean> {
    return (await this._dataSource.getRepository(AdminUserEntity).count()) > 0;
  }

  async isMaintenanceEnabled(): Promise<boolean> {
    return (await this.getState()).maintenanceEnabled;
  }

  async getRestartGeneration(): Promise<number> {
    return (await this.getState()).restartGeneration;
  }

  async removeExpiredRecords(now: string): Promise<void> {
    await this._dataSource
      .getRepository(AdminSessionEntity)
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now })
      .execute();
    await this._dataSource
      .getRepository(AdminRateLimitAttemptEntity)
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now })
      .execute();
    await this._dataSource
      .getRepository(AdminPasswordResetEntity)
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now })
      .execute();
    await this._dataSource
      .getRepository(AdminMailOutboxEntity)
      .createQueryBuilder()
      .delete()
      .where('sent_at < :now', { now })
      .execute();
  }
}
