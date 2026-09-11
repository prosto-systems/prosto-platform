import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('platform_admin_mail_outbox')
@Index('platform_admin_mail_outbox_lease_ix', [
  'leaseExpiresAt',
  'nextAttemptAt',
])
@Index('platform_admin_mail_outbox_created_at_ix', ['createdAt'])
/** @internal Leased SMTP work item. */
export class AdminMailOutboxEntity {
  @Column({ name: 'attempt_count', type: 'integer' })
  attemptCount!: number;

  @Column({ length: 40, name: 'created_at', type: 'varchar' })
  createdAt!: string;

  @Column({
    length: 512,
    name: 'encrypted_token',
    nullable: true,
    type: 'varchar',
  })
  encryptedToken!: string | null;

  @Column({
    length: 256,
    name: 'failure_code',
    nullable: true,
    type: 'varchar',
  })
  failureCode!: string | null;

  @PrimaryColumn({ length: 64, type: 'varchar' })
  id!: string;

  @Column({
    length: 40,
    name: 'lease_expires_at',
    nullable: true,
    type: 'varchar',
  })
  leaseExpiresAt!: string | null;

  @Column({ length: 64, name: 'lease_owner', nullable: true, type: 'varchar' })
  leaseOwner!: string | null;

  @Column({ length: 40, name: 'next_attempt_at', type: 'varchar' })
  nextAttemptAt!: string;

  @Column({ length: 254, name: 'recipient_email', type: 'varchar' })
  recipientEmail!: string;

  @Column({ length: 40, name: 'sent_at', nullable: true, type: 'varchar' })
  sentAt!: string | null;

  @Column({ length: 64, name: 'user_id', type: 'varchar' })
  userId!: string;
}
