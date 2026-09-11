import type {
  MigrationInterface,
  QueryRunner,
  TableColumnOptions,
} from 'typeorm';
import { Table, TableIndex } from 'typeorm';

const timestamp = '1788739200000';

function varchar(
  name: string,
  options: Partial<TableColumnOptions> = {},
): TableColumnOptions {
  return { name, type: 'varchar', ...options };
}

function integer(
  name: string,
  options: Partial<TableColumnOptions> = {},
): TableColumnOptions {
  return { name, type: 'integer', ...options };
}

/** @internal Creates the portable persistence schema for platform-admin. */
export class platform_admin_initial1788739200000 implements MigrationInterface {
  readonly name = `platform_admin_initial${timestamp}`;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'platform_admin_user',
        columns: [
          varchar('id', { isPrimary: true, length: '64' }),
          varchar('email', { length: '254' }),
          varchar('normalized_email', { length: '254' }),
          varchar('display_name', { length: '120' }),
          varchar('password_hash', { length: '512' }),
          varchar('role', { length: '16' }),
          varchar('created_at', { length: '40' }),
          varchar('updated_at', { length: '40' }),
        ],
      }),
    );
    await queryRunner.createIndex(
      'platform_admin_user',
      new TableIndex({
        name: 'platform_admin_user_normalized_email_uq',
        columnNames: ['normalized_email'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_admin_session',
        columns: [
          varchar('id', { isPrimary: true, length: '64' }),
          varchar('user_id', { length: '64' }),
          varchar('token_digest', { length: '64' }),
          varchar('csrf_digest', { length: '64' }),
          varchar('created_at', { length: '40' }),
          varchar('expires_at', { length: '40' }),
          varchar('revoked_at', { length: '40', isNullable: true }),
        ],
      }),
    );
    await this._createIndexes(queryRunner, 'platform_admin_session', [
      ['platform_admin_session_token_digest_uq', ['token_digest'], true],
      ['platform_admin_session_expires_at_ix', ['expires_at'], false],
      ['platform_admin_session_user_id_ix', ['user_id'], false],
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'platform_admin_password_reset',
        columns: [
          varchar('id', { isPrimary: true, length: '64' }),
          varchar('user_id', { length: '64' }),
          varchar('token_digest', { length: '64' }),
          varchar('created_at', { length: '40' }),
          varchar('expires_at', { length: '40' }),
          varchar('consumed_at', { length: '40', isNullable: true }),
        ],
      }),
    );
    await this._createIndexes(queryRunner, 'platform_admin_password_reset', [
      ['platform_admin_password_reset_token_digest_uq', ['token_digest'], true],
      ['platform_admin_password_reset_expires_at_ix', ['expires_at'], false],
      ['platform_admin_password_reset_user_id_ix', ['user_id'], false],
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'platform_admin_mail_outbox',
        columns: [
          varchar('id', { isPrimary: true, length: '64' }),
          varchar('user_id', { length: '64' }),
          varchar('recipient_email', { length: '254' }),
          varchar('encrypted_token', { length: '512', isNullable: true }),
          integer('attempt_count'),
          varchar('next_attempt_at', { length: '40' }),
          varchar('lease_owner', { length: '64', isNullable: true }),
          varchar('lease_expires_at', { length: '40', isNullable: true }),
          varchar('sent_at', { length: '40', isNullable: true }),
          varchar('failure_code', { length: '256', isNullable: true }),
          varchar('created_at', { length: '40' }),
        ],
      }),
    );
    await this._createIndexes(queryRunner, 'platform_admin_mail_outbox', [
      [
        'platform_admin_mail_outbox_lease_ix',
        ['lease_expires_at', 'next_attempt_at'],
        false,
      ],
      ['platform_admin_mail_outbox_created_at_ix', ['created_at'], false],
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'platform_admin_activity',
        columns: [
          varchar('id', { isPrimary: true, length: '64' }),
          varchar('actor_user_id', { length: '64', isNullable: true }),
          varchar('event_type', { length: '80' }),
          varchar('metadata_json', { length: '512', isNullable: true }),
          varchar('occurred_at', { length: '40' }),
        ],
      }),
    );
    await this._createIndexes(queryRunner, 'platform_admin_activity', [
      ['platform_admin_activity_occurred_at_ix', ['occurred_at', 'id'], false],
      [
        'platform_admin_activity_actor_ix',
        ['actor_user_id', 'occurred_at'],
        false,
      ],
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'platform_admin_rate_limit_attempt',
        columns: [
          varchar('id', { isPrimary: true, length: '64' }),
          varchar('scope', { length: '40' }),
          varchar('subject_digest', { length: '64' }),
          varchar('created_at', { length: '40' }),
          varchar('expires_at', { length: '40' }),
        ],
      }),
    );
    await this._createIndexes(
      queryRunner,
      'platform_admin_rate_limit_attempt',
      [
        [
          'platform_admin_rate_limit_attempt_key_ix',
          ['scope', 'subject_digest', 'expires_at'],
          false,
        ],
        [
          'platform_admin_rate_limit_attempt_expires_at_ix',
          ['expires_at'],
          false,
        ],
      ],
    );

    await queryRunner.createTable(
      new Table({
        name: 'platform_admin_state',
        columns: [
          varchar('id', { isPrimary: true, length: '64' }),
          { name: 'maintenance_enabled', type: 'boolean', default: 'false' },
          { name: 'restart_generation', type: 'integer', default: '0' },
          varchar('updated_at', { length: '40' }),
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'platform_admin_state',
      'platform_admin_rate_limit_attempt',
      'platform_admin_activity',
      'platform_admin_mail_outbox',
      'platform_admin_password_reset',
      'platform_admin_session',
      'platform_admin_user',
    ]) {
      await queryRunner.dropTable(table);
    }
  }

  private async _createIndexes(
    queryRunner: QueryRunner,
    table: string,
    indexes: readonly (readonly [string, readonly string[], boolean])[],
  ): Promise<void> {
    for (const [name, columnNames, isUnique] of indexes) {
      await queryRunner.createIndex(
        table,
        new TableIndex({ name, columnNames: [...columnNames], isUnique }),
      );
    }
  }
}
