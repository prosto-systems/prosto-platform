import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { IPlatformRuntimeAdapterLogger } from '@prosto/platform-sdk/platform';
import type { DataSource } from 'typeorm';
import { AdminMailOutboxEntity } from '@/entities/index.js';
import type { AdminConfigurationType } from '@/config/index.js';
import type { SecretCipher } from './secret-cipher.service.js';

/** @internal Leases and delivers reset mail with at-least-once semantics. */
export class OutboxWorker {
  private readonly _leaseOwner = randomUUID();
  private readonly _transporter: Transporter;
  private _interval: NodeJS.Timeout | undefined;
  private _inFlight: Promise<void> | undefined;

  constructor(
    private readonly _dataSource: DataSource,
    private readonly _configuration: AdminConfigurationType,
    private readonly _cipher: SecretCipher,
    private readonly _logger: IPlatformRuntimeAdapterLogger,
  ) {
    this._transporter = nodemailer.createTransport({
      auth: _configuration.smtp.auth,
      host: _configuration.smtp.host,
      port: _configuration.smtp.port,
      secure: _configuration.smtp.secure,
    });
  }

  start(): void {
    this._interval = setInterval(() => {
      void this._deliverOne();
    }, 1_000);
  }

  async stop(): Promise<void> {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }

    await this._inFlight;
    this._transporter.close();
  }

  private _deliverOne(): Promise<void> {
    if (this._inFlight) {
      return this._inFlight;
    }

    this._inFlight = this._deliverOneInFlight().finally(() => {
      this._inFlight = undefined;
    });
    return this._inFlight;
  }

  private async _deliverOneInFlight(): Promise<void> {
    let leasedItem: AdminMailOutboxEntity | undefined;

    try {
      const now = new Date();
      const repository = this._dataSource.getRepository(AdminMailOutboxEntity);
      const item = await repository
        .createQueryBuilder('outbox')
        .where('outbox.sent_at IS NULL')
        .andWhere('outbox.next_attempt_at <= :now', { now: now.toISOString() })
        .andWhere(
          '(outbox.lease_expires_at IS NULL OR outbox.lease_expires_at < :now)',
          {
            now: now.toISOString(),
          },
        )
        .orderBy('outbox.created_at', 'ASC')
        .getOne();

      if (!item) {
        return;
      }

      const leaseExpiresAt = new Date(
        now.getTime() + this._configuration.outbox.leaseSeconds * 1_000,
      ).toISOString();
      const claim = await repository
        .createQueryBuilder()
        .update(AdminMailOutboxEntity)
        .set({ leaseExpiresAt, leaseOwner: this._leaseOwner })
        .where('id = :id', { id: item.id })
        .andWhere('sent_at IS NULL')
        .andWhere('(lease_expires_at IS NULL OR lease_expires_at < :now)', {
          now: now.toISOString(),
        })
        .execute();

      if (claim.affected !== 1 || !item.encryptedToken) {
        return;
      }

      leasedItem = item;

      const token = this._cipher.decrypt(item.encryptedToken);
      const resetUrl = new URL(this._configuration.resetUrlBase);

      resetUrl.searchParams.set('token', token);

      await this._transporter.sendMail({
        from: this._configuration.smtp.from,
        subject: 'Platform administration password reset',
        text: `Use this one-time password reset link: ${resetUrl.toString()}`,
        to: item.recipientEmail,
      });
      await repository.update(item.id, {
        encryptedToken: null,
        failureCode: null,
        leaseExpiresAt: null,
        leaseOwner: null,
        sentAt: new Date().toISOString(),
      });
    } catch {
      if (leasedItem) {
        const attemptCount = leasedItem.attemptCount + 1;
        const retrySeconds = Math.min(
          this._configuration.outbox.retryBaseSeconds * 2 ** (attemptCount - 1),
          86_400,
        );
        await this._dataSource.getRepository(AdminMailOutboxEntity).update(
          { id: leasedItem.id, leaseOwner: this._leaseOwner },
          {
            attemptCount,
            failureCode: 'delivery_failed',
            leaseExpiresAt: null,
            leaseOwner: null,
            nextAttemptAt:
              attemptCount >= this._configuration.outbox.maxAttempts
                ? new Date(8_640_000_000_000_000).toISOString()
                : new Date(Date.now() + retrySeconds * 1_000).toISOString(),
          },
        );
      }
      this._logger.error('platform-admin SMTP outbox delivery failed.');
    }
  }
}
