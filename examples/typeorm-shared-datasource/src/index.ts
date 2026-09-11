import { fileURLToPath } from 'node:url';
import { PlatformAdminTypeOrmAdapter } from '@prosto/platform-adapter-admin-typeorm';
import {
  createTypeOrmPersistenceDescriptor,
  TypeOrmPersistenceAdapter,
} from '@prosto/platform-adapter-typeorm';
import { FastifyHttpAdapter } from '@prosto/platform-adapter-fastify';
import { RuntimeBuilder } from '@prosto/platform-core';
import type { IPersistenceDescriptor } from '@prosto/platform-sdk/platform';
import {
  Entity,
  type MigrationInterface,
  PrimaryGeneratedColumn,
  type QueryRunner,
  Table,
} from 'typeorm';

// Entities

@Entity('platform_audit_entry')
class PlatformAuditEntry {
  @PrimaryGeneratedColumn()
  id!: number;
}

// Migrations

class platform_create_audit_entry1710000001000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'platform_audit_entry',
        columns: [{ name: 'id', type: 'integer', isPrimary: true }],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('platform_audit_entry');
  }
}

// Platform persistence descriptor
const platformPersistenceDescriptor: IPersistenceDescriptor = {
  owner: 'platform',
  ownerId: 'platform',
  payload: createTypeOrmPersistenceDescriptor({
    entities: [PlatformAuditEntry],
    migrations: [platform_create_audit_entry1710000001000],
  }),
};

// Main entry point
async function main(): Promise<void> {
  const http = new FastifyHttpAdapter({
    host: '127.0.0.1',
    port: 3001,
  });
  const runtime = new RuntimeBuilder().build({
    configDir: fileURLToPath(new URL('../config', import.meta.url)),
    environment: 'development',
    adapters: {
      http,
      persistence: new TypeOrmPersistenceAdapter(),
      admin: new PlatformAdminTypeOrmAdapter(),
    },
    platformPersistenceDescriptor,
  });

  await runtime.start();
  console.info(`HTTP adapter is listening at ${http.url?.href}`);
  console.info(
    'TypeORM shared DataSource startup report:',
    runtime.reports.startup,
  );

  const shutdown = async (): Promise<void> => {
    console.info('Shutting down...');
    await runtime.stop();
  };

  process.once('SIGINT', async (): Promise<void> => {
    await shutdown();
  });
  process.once('SIGTERM', async (): Promise<void> => {
    await shutdown();
  });
}

main().catch((error: unknown) => {
  console.error(
    'The TypeORM shared DataSource example failed to start.',
    error,
  );
  process.exitCode = 1;
});
