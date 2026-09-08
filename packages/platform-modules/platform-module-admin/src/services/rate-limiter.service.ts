import { createHash, randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { AdminRateLimitAttemptEntity } from '@/entities/index.js';

/** @internal Database-backed rate limiter keyed exclusively by privacy-safe digests. */
export class RateLimiter {
  constructor(private readonly _dataSource: DataSource) {}

  digestSubject(
    remoteAddress: string | undefined,
    normalizedEmail: string,
  ): string {
    return createHash('sha256')
      .update(`${remoteAddress ?? 'unknown'}\u0000${normalizedEmail}`)
      .digest('hex');
  }

  async isAllowed(input: {
    readonly maxAttempts: number;
    readonly scope: string;
    readonly subjectDigest: string;
    readonly windowSeconds: number;
  }): Promise<boolean> {
    const repository = this._dataSource.getRepository(
      AdminRateLimitAttemptEntity,
    );
    const now = new Date();
    const nowValue = now.toISOString();
    const activeAttempts = await repository
      .createQueryBuilder('attempt')
      .where('attempt.scope = :scope', { scope: input.scope })
      .andWhere('attempt.subject_digest = :subjectDigest', {
        subjectDigest: input.subjectDigest,
      })
      .andWhere('attempt.expires_at > :now', { now: nowValue })
      .getCount();

    if (activeAttempts >= input.maxAttempts) {
      return false;
    }

    await repository.insert({
      id: randomUUID(),
      scope: input.scope,
      subjectDigest: input.subjectDigest,
      createdAt: nowValue,
      expiresAt: new Date(
        now.getTime() + input.windowSeconds * 1_000,
      ).toISOString(),
    });

    return true;
  }
}
