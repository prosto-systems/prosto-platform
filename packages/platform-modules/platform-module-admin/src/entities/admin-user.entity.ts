import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('platform_admin_user')
@Index('platform_admin_user_normalized_email_uq', ['normalizedEmail'], {
  unique: true,
})
/** @internal Persistent administration user. */
export class AdminUserEntity {
  @Column({ length: 120, name: 'display_name', type: 'varchar' })
  displayName!: string;

  @Column({ length: 254, name: 'email', type: 'varchar' })
  email!: string;

  @PrimaryColumn({ length: 64, type: 'varchar' })
  id!: string;

  @Column({ length: 254, name: 'normalized_email', type: 'varchar' })
  normalizedEmail!: string;

  @Column({ length: 512, name: 'password_hash', type: 'varchar' })
  passwordHash!: string;

  @Column({ length: 16, type: 'varchar' })
  role!: 'admin' | 'operator' | 'viewer';

  @Column({ length: 40, name: 'created_at', type: 'varchar' })
  createdAt!: string;

  @Column({ length: 40, name: 'updated_at', type: 'varchar' })
  updatedAt!: string;
}
