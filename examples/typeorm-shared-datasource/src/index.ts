import type { IPersistenceDescriptor } from '@prosto/platform-sdk';
import { fileURLToPath } from 'node:url';
import {
  createTypeOrmPersistenceDescriptor,
  TypeOrmPersistenceProvider,
} from '@prosto/platform-adapter-typeorm';
import { RuntimeBuilder } from '@prosto/platform-core';
import Fastify from 'fastify';
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
  const runtime = new RuntimeBuilder().build({
    configDir: fileURLToPath(new URL('../config', import.meta.url)),
    persistenceProvider: new TypeOrmPersistenceProvider(),
    platformPersistenceDescriptor,
  });

  await runtime.start();

  console.log(JSON.stringify(runtime.reports.startup, null, 2));

  const shutdown = async (): Promise<void> => {
    console.log('Shutting down...');
    await runtime.stop();
    console.log(JSON.stringify(runtime.reports.shutdown, null, 2));
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const fastify = Fastify({
    logger: true,
  });

  fastify.get('/', async function handler(_request, _reply) {
    return runtime.reports.startup;
  });

  await fastify.listen({ port: 3001 }).catch((error) => {
    fastify.log.error(error);

    throw new Error(error instanceof Error ? error.message : String(error), {
      cause: error,
    });
  });
}

main().catch(() => {
  process.exit(1);
});
