import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('platform_admin_activity')
@Index('platform_admin_activity_occurred_at_ix', ['occurredAt', 'id'])
@Index('platform_admin_activity_actor_ix', ['actorUserId', 'occurredAt'])
/** @internal Sanitized administration audit activity. */
export class AdminActivityEntity {
  @Column({
    length: 64,
    name: 'actor_user_id',
    nullable: true,
    type: 'varchar',
  })
  actorUserId!: string | null;

  @Column({ length: 80, name: 'event_type', type: 'varchar' })
  eventType!: string;

  @PrimaryColumn({ length: 64, type: 'varchar' })
  id!: string;

  @Column({
    length: 512,
    name: 'metadata_json',
    nullable: true,
    type: 'varchar',
  })
  metadataJson!: string | null;

  @Column({ length: 40, name: 'occurred_at', type: 'varchar' })
  occurredAt!: string;
}
