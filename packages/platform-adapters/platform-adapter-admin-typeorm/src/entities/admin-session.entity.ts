import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('platform_admin_session')
@Index('platform_admin_session_token_digest_uq', ['tokenDigest'], {
  unique: true,
})
@Index('platform_admin_session_expires_at_ix', ['expiresAt'])
@Index('platform_admin_session_user_id_ix', ['userId'])
/** @internal Persistent opaque administration session. */
export class AdminSessionEntity {
  @Column({ length: 40, name: 'created_at', type: 'varchar' })
  createdAt!: string;

  @Column({ length: 64, name: 'csrf_digest', type: 'varchar' })
  csrfDigest!: string;

  @Column({ length: 40, name: 'expires_at', type: 'varchar' })
  expiresAt!: string;

  @PrimaryColumn({ length: 64, type: 'varchar' })
  id!: string;

  @Column({ length: 40, name: 'revoked_at', nullable: true, type: 'varchar' })
  revokedAt!: string | null;

  @Column({ length: 64, name: 'token_digest', type: 'varchar' })
  tokenDigest!: string;

  @Column({ length: 64, name: 'user_id', type: 'varchar' })
  userId!: string;
}
