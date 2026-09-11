import type {
  IMigrationLockFactoryInterface,
  ITypeOrmPersistenceConfig,
  TypeOrmPersistenceAdapterStateType,
  TypeOrmDialectType,
} from '@/interfaces/index.js';
import {
  type IPlatformRuntimeAdapterInitializationContext,
  type IPlatformRuntimeAdapterStartContext,
  type IPlatformRuntimeAdapterStopContext,
  type IPlatformRuntimeScopedServiceRegistrar,
  type IPersistenceRuntimeAdapter,
  PersistenceDescriptorRegistry,
  PersistenceError,
} from '@prosto/platform-sdk/platform';
import {
  DataSource,
  type DataSourceOptions,
  type EntityTarget,
  type MigrationInterface,
} from 'typeorm';
import { MigrationLockFactory } from '@/factories/index.js';
import { TypeOrmDescriptorValidationError } from '@/errors/index.js';
import { TYPEORM_DATA_SOURCE_SERVICE_TOKEN } from '@/tokens/index.js';
import { collectValidatedTypeOrmMetadata } from '@/utils/index.js';
import { parseTypeOrmPersistenceConfig } from '@/schemas/index.js';

/**
 * @alpha
 * Required persistence adapter that owns one shared TypeORM 1.1 `DataSource`.
 *
 * The adapter validates collected module metadata, acquires a dialect-specific
 * migration lock, runs migrations, and publishes the data source only after
 * successful initialization. Public `sqlite` configuration is implemented by
 * the `better-sqlite3` driver and requires `database` instead of `url`.
 */
export class TypeOrmPersistenceAdapter implements IPersistenceRuntimeAdapter {
  readonly id = 'typeorm';
  readonly role = 'persistence' as const;
  readonly descriptors = new PersistenceDescriptorRegistry();

  private _dataSource: DataSource | undefined;
  private _services: IPlatformRuntimeScopedServiceRegistrar | undefined;
  private _initialized = false;
  private _published = false;

  constructor(
    private _migrationLockFactory: IMigrationLockFactoryInterface = new MigrationLockFactory(),
  ) {}

  private _state: TypeOrmPersistenceAdapterStateType = 'new';

  get state(): TypeOrmPersistenceAdapterStateType {
    return this._state;
  }

  async initialize(
    context: IPlatformRuntimeAdapterInitializationContext,
  ): Promise<void> {
    if (this._initialized) {
      throw new PersistenceError(
        'PersistenceInitializationFailed',
        `TypeORM persistence adapter cannot initialize from ${this._state} state.`,
        { phase: this._state },
      );
    }

    this._services = context.contributions.services;
    this._initialized = true;
    this._state = 'collecting';
  }

  async start(context: IPlatformRuntimeAdapterStartContext): Promise<void> {
    if (!this._initialized || this._state !== 'collecting') {
      throw new PersistenceError(
        'PersistenceInitializationFailed',
        `TypeORM persistence adapter cannot start from ${this._state} state.`,
        { phase: this._state },
      );
    }

    this._state = 'initializing';

    let dataSource: DataSource | undefined;

    try {
      const configuration = this._getTypeOrmConfiguration(context.config);
      const { entities, migrations } = collectValidatedTypeOrmMetadata(
        this.descriptors.seal(),
        configuration.type,
      );

      dataSource = new DataSource(
        this._createDataSourceOptions(configuration, entities, migrations),
      );

      await dataSource.initialize();

      await this._runMigrations(dataSource, configuration);

      // Publish only after initialization, migrations, and lock release succeed.
      this._services?.register(TYPEORM_DATA_SOURCE_SERVICE_TOKEN, dataSource);

      this._dataSource = dataSource;
      this._published = true;
      this._state = 'ready';
    } catch (error) {
      this._unpublishDataSource();

      await this._destroyDataSource(dataSource);

      this._state = 'failed';

      throw this._mapInitializationError(
        error,
        this._getConfiguredDialect(context.config),
      );
    }
  }

  async stop(_context: IPlatformRuntimeAdapterStopContext): Promise<void> {
    if (this._state === 'stopped') {
      return;
    }

    const dataSource = this._dataSource;

    this._dataSource = undefined;
    this._unpublishDataSource();
    this._services = undefined;

    await this._destroyDataSource(dataSource);

    this._state = 'stopped';
  }

  private _getTypeOrmConfiguration(
    configuration: Readonly<Record<string, unknown>>,
  ): ITypeOrmPersistenceConfig {
    try {
      return parseTypeOrmPersistenceConfig(configuration);
    } catch {
      throw new PersistenceError(
        'PersistenceInitializationFailed',
        'TypeORM adapter configuration is invalid.',
        { phase: 'configuration' },
      );
    }
  }

  private _getConfiguredDialect(
    configuration: Readonly<Record<string, unknown>>,
  ): TypeOrmDialectType | undefined {
    return this._getTypeOrmConfiguration(configuration).type;
  }

  private _createDataSourceOptions(
    configuration: ITypeOrmPersistenceConfig,
    entities: EntityTarget<unknown>[],
    migrations: (new () => MigrationInterface)[],
  ): DataSourceOptions {
    if (configuration.enabled === false || configuration.type === undefined) {
      throw new PersistenceError(
        'PersistenceInitializationFailed',
        'TypeORM persistence is not enabled or does not specify a dialect.',
        { phase: 'configuration' },
      );
    }

    const commonOptions: Pick<
      DataSourceOptions,
      'entities' | 'migrations' | 'synchronize' | 'migrationsRun'
    > = {
      // EntityTarget additionally admits adapter payload metadata. TypeORM accepts
      // the validated constructor/schema subset in its DataSource options.
      entities: entities as DataSourceOptions['entities'],
      migrations: migrations as DataSourceOptions['migrations'],
      synchronize: false,
      migrationsRun: false,
    };

    if (configuration.type === 'sqlite') {
      if (
        configuration.url !== undefined ||
        configuration.database === undefined
      ) {
        throw new PersistenceError(
          'PersistenceInitializationFailed',
          'TypeORM SQLite persistence configuration requires a database and does not support URL.',
          { dialect: configuration.type, phase: 'configuration' },
        );
      }

      return {
        type: 'better-sqlite3',
        database: configuration.database,
        ...commonOptions,
      };
    }

    if (configuration.url !== undefined) {
      return {
        type: configuration.type,
        url: configuration.url,
        ...commonOptions,
      } as DataSourceOptions;
    }

    if (configuration.database === undefined) {
      throw new PersistenceError(
        'PersistenceInitializationFailed',
        'TypeORM persistence configuration requires a database or URL.',
        { dialect: configuration.type, phase: 'configuration' },
      );
    }

    switch (configuration.type) {
      case 'postgres':
        return {
          type: 'postgres',
          host: configuration.host,
          port: configuration.port,
          database: configuration.database,
          username: configuration.username,
          password: configuration.password,
          schema: configuration.schema,
          connectTimeoutMS: configuration.connectTimeoutMs,
          extra:
            configuration.poolSize === undefined
              ? undefined
              : { max: configuration.poolSize },
          ...commonOptions,
        };

      case 'mysql':
      case 'mariadb':
        return {
          type: configuration.type,
          host: configuration.host,
          port: configuration.port,
          database: configuration.database,
          username: configuration.username,
          password: configuration.password,
          connectTimeout: configuration.connectTimeoutMs,
          extra:
            configuration.poolSize === undefined
              ? undefined
              : { connectionLimit: configuration.poolSize },
          ...commonOptions,
        };

      case 'mssql':
        return {
          type: 'mssql',
          host: configuration.host,
          port: configuration.port,
          database: configuration.database,
          username: configuration.username,
          password: configuration.password,
          connectionTimeout: configuration.connectTimeoutMs,
          options: configuration.options,
          pool:
            configuration.poolSize === undefined
              ? undefined
              : { max: configuration.poolSize },
          ...commonOptions,
        };
    }
  }

  private async _destroyDataSource(dataSource?: DataSource): Promise<void> {
    if (dataSource?.isInitialized === true) {
      await dataSource.destroy();
    }
  }

  private _unpublishDataSource(): void {
    if (!this._published) return;

    this._services?.unregister(TYPEORM_DATA_SOURCE_SERVICE_TOKEN);
    this._published = false;
  }

  private async _runMigrations(
    dataSource: DataSource,
    configuration: ITypeOrmPersistenceConfig,
  ): Promise<void> {
    const lock = this._migrationLockFactory.create(dataSource, configuration);
    let migrationError: unknown;

    try {
      await lock.acquire(configuration.migrationLockTimeoutMs ?? 60000);
      await dataSource.runMigrations({
        // SQLite's exclusive lock is itself the migration transaction.
        transaction:
          configuration.type === 'sqlite' &&
          configuration.database !== ':memory:'
            ? 'none'
            : (configuration.migrationTransactionMode ?? 'each'),
      });
    } catch (error) {
      migrationError = error;
    }

    try {
      await lock.release();
    } catch {
      throw new PersistenceError(
        'PersistenceMigrationFailed',
        'TypeORM migration lock release failed.',
        {
          phase: 'migration-lock-release',
          remediationHint:
            'Verify database connectivity and confirm no stale migration lock remains.',
        },
      );
    }

    if (migrationError) {
      if (migrationError instanceof PersistenceError) {
        throw migrationError;
      }

      throw new PersistenceError(
        'PersistenceMigrationFailed',
        'TypeORM migration execution failed.',
        {
          phase: 'migrations',
          remediationHint:
            'Inspect the migration identifiers and database migration journal.',
        },
      );
    }
  }

  private _mapInitializationError(
    error: unknown,
    dialect: TypeOrmDialectType | undefined,
  ): PersistenceError {
    if (error instanceof PersistenceError) {
      return error;
    }

    if (error instanceof TypeOrmDescriptorValidationError) {
      return new PersistenceError(
        'PersistenceDescriptorValidationFailed',
        error.message,
        {
          ownerId: error.descriptor.ownerId,
          moduleId:
            error.descriptor.owner === 'module'
              ? error.descriptor.ownerId
              : undefined,
          phase: 'validation',
          remediationHint: error.remediationHint,
        },
      );
    }

    const message = error instanceof Error ? error.message : String(Error);
    const driver = this._getUnavailableDriver(message, dialect);

    if (driver !== undefined) {
      return new PersistenceError(
        'PersistenceDriverUnavailable',
        `TypeORM driver package ${driver} is unavailable. Install it in the application using this adapter.`,
        {
          dialect,
          remediationHint: `Install the ${driver} peer dependency.`,
        },
      );
    }

    return new PersistenceError(
      'PersistenceInitializationFailed',
      'TypeORM DataSource initialization failed.',
      { phase: 'initializing' },
    );
  }

  private _getUnavailableDriver(
    message: string,
    dialect: TypeOrmDialectType | undefined,
  ): string | undefined {
    const explicitDriver =
      /Please install (pg|mysql2|better-sqlite3|mssql) package manually/i.exec(
        message,
      )?.[1];

    if (explicitDriver !== undefined) {
      return explicitDriver;
    }

    if (!/package has not been found installed/i.test(message)) {
      return undefined;
    }

    switch (dialect) {
      case 'postgres':
        return 'pg';

      case 'mysql':
      case 'mariadb':
        return 'mysql2';

      case 'sqlite':
        return 'better-sqlite3';

      case 'mssql':
        return 'mssql';
    }
  }
}
