import type { ITypeOrmPersistenceConfig } from '@/interfaces/index.js';
import { z } from 'zod';

const TYPEORM_DIALECTS = [
  'postgres',
  'mysql',
  'mariadb',
  'sqlite',
  'mssql',
] as const;

/** @internal Validates the TypeORM adapter's scoped configuration. */
export const typeOrmPersistenceConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    type: z.enum(TYPEORM_DIALECTS).optional(),
    host: z.string().min(1).optional(),
    port: z.number().int().min(1).max(65535).optional(),
    database: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
    url: z.url().optional(),
    schema: z.string().min(1).optional(),
    poolSize: z.number().int().positive().finite().optional(),
    connectTimeoutMs: z.number().int().positive().finite().optional(),
    migrationLockTimeoutMs: z
      .number()
      .int()
      .positive()
      .max(600000)
      .default(60000),
    migrationTransactionMode: z.enum(['all', 'each', 'none']).default('each'),
    synchronize: z.literal(false).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .superRefine((config, context) => {
    if (config.enabled === false || config.type === undefined) {
      return;
    }

    if (config.type === 'sqlite') {
      if (config.url !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['url'],
          message: 'TypeORM sqlite does not support url.',
        });
      }

      if (config.database === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['database'],
          message: 'TypeORM sqlite requires database connection settings.',
        });
      }

      for (const field of [
        'host',
        'port',
        'username',
        'password',
        'schema',
        'poolSize',
        'connectTimeoutMs',
        'options',
      ] as const) {
        if (config[field] !== undefined) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: `TypeORM sqlite does not support ${field}.`,
          });
        }
      }
    } else {
      const structuredFields = [
        config.host,
        config.port,
        config.database,
        config.username,
        config.password,
        config.schema,
        config.poolSize,
        config.connectTimeoutMs,
        config.options,
      ];

      if (config.url && structuredFields.some((value) => value !== undefined)) {
        context.addIssue({
          code: 'custom',
          path: ['url'],
          message:
            'TypeORM url cannot be combined with structured connection fields.',
        });
      }

      if (!config.url && !config.database) {
        context.addIssue({
          code: 'custom',
          path: ['database'],
          message:
            'TypeORM requires either url or database connection settings.',
        });
      }

      if (!config.url && (!config.host || !config.username)) {
        context.addIssue({
          code: 'custom',
          path: ['host'],
          message:
            'TypeORM server dialects require host and username when url is absent.',
        });
      }
    }

    if (config.schema && config.type !== 'postgres') {
      context.addIssue({
        code: 'custom',
        path: ['schema'],
        message: 'TypeORM schema is supported only for the postgres dialect.',
      });
    }
  });

export function parseTypeOrmPersistenceConfig(
  configuration: Readonly<Record<string, unknown>>,
): ITypeOrmPersistenceConfig {
  return typeOrmPersistenceConfigSchema.parse(configuration);
}
