import { DataSource } from 'typeorm';
import { afterEach, describe, expect, it } from 'vitest';
import { platform_admin_initial1788739200000 } from '@/migrations/index.js';

const dataSources: DataSource[] = [];

afterEach(async () => {
  await Promise.all(
    dataSources.splice(0).map(async (dataSource) => dataSource.destroy()),
  );
});

describe('platform_admin_initial1788739200000', () => {
  it('creates all administration persistence tables', async () => {
    const dataSource = new DataSource({
      database: ':memory:',
      migrations: [platform_admin_initial1788739200000],
      type: 'better-sqlite3',
    });
    dataSources.push(dataSource);
    await dataSource.initialize();

    await dataSource.runMigrations();
    const tables = await dataSource.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );

    expect(tables.map((table: { name: string }) => table.name)).toEqual(
      expect.arrayContaining([
        'platform_admin_activity',
        'platform_admin_mail_outbox',
        'platform_admin_password_reset',
        'platform_admin_rate_limit_attempt',
        'platform_admin_session',
        'platform_admin_state',
        'platform_admin_user',
      ]),
    );
  });
});
