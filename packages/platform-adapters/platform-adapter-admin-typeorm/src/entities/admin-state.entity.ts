import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('platform_admin_state')
/** @internal Shared singleton administration state. */
export class AdminStateEntity {
  @PrimaryColumn({ length: 64, type: 'varchar' })
  id!: string;

  @Column({ default: false, name: 'maintenance_enabled', type: 'boolean' })
  maintenanceEnabled!: boolean;

  @Column({ default: 0, name: 'restart_generation', type: 'integer' })
  restartGeneration!: number;

  @Column({ length: 40, name: 'updated_at', type: 'varchar' })
  updatedAt!: string;
}
