import type { PlatformStartupPolicyType } from '@prosto/platform-sdk/platform';
import type { IConfigAccessPolicy } from '@/modularity/index.js';

/**
 * @alpha
 * Driver-neutral database dialects accepted by platform configuration.
 */
export type TypeOrmDialectType =
  'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql';

/**
 * @alpha
 * Transaction scope used while TypeORM runs pending migrations.
 */
export type TypeOrmMigrationTransactionModeType = 'all' | 'each' | 'none';

/**
 * @alpha
 * Platform persistence configuration interface.
 */
export interface IPersistencePlatformConfig {
  typeorm: ITypeOrmPersistencePlatformConfig;
}

/**
 * @alpha
 * Driver-neutral TypeORM persistence settings. This contract deliberately does
 * not expose TypeORM option types so the core remains ORM independent.
 */
export interface ITypeOrmPersistencePlatformConfig extends Record<
  string,
  unknown
> {
  readonly enabled: boolean;
  /** Driver-neutral dialect. `sqlite` is mapped by the adapter. */
  readonly type?: TypeOrmDialectType;
  readonly host?: string;
  readonly port?: number;
  /** Required for SQLite and structured server-dialect configuration. */
  readonly database?: string;
  readonly username?: string;
  readonly password?: string;
  /** Server-dialect connection URL. Unsupported for SQLite. */
  readonly url?: string;
  readonly schema?: string;
  readonly poolSize?: number;
  readonly connectTimeoutMs?: number;
  readonly migrationLockTimeoutMs?: number;
  readonly migrationTransactionMode?: TypeOrmMigrationTransactionModeType;
  readonly synchronize?: false;
  readonly migrationsRun?: boolean;
}

/**
 * @alpha
 * Platform configuration interface.
 */
export interface IPlatformConfig extends Record<string, unknown> {
  platform: {
    name: string;
    version: string;
    /** Informational application base path. @default process.cwd() */
    basePath: string;
    /** Local package tree recursively scanned for manifests. @default './modules' */
    discoveryPath: string;
    /** Runtime package cache used for ESM imports. @default 'app_data/modules' */
    probingPath: string;
    /** Copy validated builds into the probing directory on every startup. @default false */
    refreshProbingFolderOnStart: boolean;
    /** @default 'strict' */
    startupPolicy: PlatformStartupPolicyType;
  };
  runtime: {
    /** @default 60 seconds for production, 30 seconds for development */
    shutdownTimeoutMs: number;
    correlationId?: string;
  };
  persistence: IPersistencePlatformConfig;
  modules: {
    [key: string]: unknown;
    configAccessPolicy: IConfigAccessPolicy;
  };
  security: {
    secretRedaction: {
      /**
       * Whether redaction is active.
       * @default true
       */
      enabled: boolean;
      /**
       * Key names to redact in `key=value` patterns.
       * @default ['password', 'token', 'secret', 'key', 'apiKey', 'passphrase', 'url', 'connectionString']
       */
      patterns: string[];
    };
  };
  logging: {
    /** @default 'info' */
    level: string;
    /** @default 'text' */
    format: string;
  };
  custom: Record<string, unknown>;
}
