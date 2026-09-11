import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('platform_admin_rate_limit_attempt')
@Index('platform_admin_rate_limit_attempt_key_ix', [
  'scope',
  'subjectDigest',
  'expiresAt',
])
@Index('platform_admin_rate_limit_attempt_expires_at_ix', ['expiresAt'])
/** @internal Privacy-preserving distributed rate-limit attempt. */
export class AdminRateLimitAttemptEntity {
  @Column({ length: 40, name: 'created_at', type: 'varchar' })
  createdAt!: string;

  @Column({ length: 40, name: 'expires_at', type: 'varchar' })
  expiresAt!: string;

  @PrimaryColumn({ length: 64, type: 'varchar' })
  id!: string;

  @Column({ length: 40, type: 'varchar' })
  scope!: string;

  @Column({ length: 64, name: 'subject_digest', type: 'varchar' })
  subjectDigest!: string;
}
