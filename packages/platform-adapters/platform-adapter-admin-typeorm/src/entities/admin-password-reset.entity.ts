import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('platform_admin_password_reset')
@Index('platform_admin_password_reset_token_digest_uq', ['tokenDigest'], {
  unique: true,
})
@Index('platform_admin_password_reset_expires_at_ix', ['expiresAt'])
@Index('platform_admin_password_reset_user_id_ix', ['userId'])
/** @internal One-use administration password reset token record. */
export class AdminPasswordResetEntity {
  @Column({ length: 40, name: 'consumed_at', nullable: true, type: 'varchar' })
  consumedAt!: string | null;

  @Column({ length: 40, name: 'created_at', type: 'varchar' })
  createdAt!: string;

  @Column({ length: 40, name: 'expires_at', type: 'varchar' })
  expiresAt!: string;

  @PrimaryColumn({ length: 64, type: 'varchar' })
  id!: string;

  @Column({ length: 64, name: 'token_digest', type: 'varchar' })
  tokenDigest!: string;

  @Column({ length: 64, name: 'user_id', type: 'varchar' })
  userId!: string;
}
