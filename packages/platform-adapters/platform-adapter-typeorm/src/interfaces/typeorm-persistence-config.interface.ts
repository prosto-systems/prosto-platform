/**
 * @alpha
 * Driver-neutral dialects supported by the TypeORM adapter.
 */
export type TypeOrmDialectType =
  'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql';

/**
 * @alpha
 * Transaction scope used by TypeORM migration execution.
 */
export type MigrationTransactionModeType = 'all' | 'each' | 'none';

/**
 * @alpha
 * TypeORM persistence configuration contract.
 */
export interface ITypeOrmPersistenceConfig extends Record<string, unknown> {
  readonly enabled?: boolean;
  /** Public dialect; `sqlite` is mapped to the `better-sqlite3` driver. */
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
  readonly migrationTransactionMode?: MigrationTransactionModeType;
  /**
   * Driver-specific options forwarded to the underlying TypeORM driver
   * (e.g., `encrypt`, `trustServerCertificate` for MSSQL/`tedious`).
   */
  readonly options?: Readonly<Record<string, unknown>>;
}
