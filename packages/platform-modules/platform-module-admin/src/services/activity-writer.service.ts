import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { AdminActivityEntity } from '@/entities/index.js';

/** @internal Writes bounded, sanitized administration activity records. */
export class ActivityWriter {
  constructor(private readonly _dataSource: DataSource) {}

  async write(input: {
    readonly actorUserId?: string;
    readonly eventType: string;
    readonly metadata?: Readonly<Record<string, string | number | boolean>>;
  }): Promise<void> {
    const metadata = input.metadata
      ? JSON.stringify(
          Object.fromEntries(
            Object.entries(input.metadata).filter(
              ([key]) => !/(password|token|secret|cookie)/i.test(key),
            ),
          ),
        ).slice(0, 512)
      : null;

    await this._dataSource.getRepository(AdminActivityEntity).insert({
      id: randomUUID(),
      actorUserId: input.actorUserId ?? null,
      eventType: input.eventType.slice(0, 80),
      metadataJson: metadata,
      occurredAt: new Date().toISOString(),
    });
  }
}
