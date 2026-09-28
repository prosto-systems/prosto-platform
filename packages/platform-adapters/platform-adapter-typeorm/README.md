# TypeORM Persistence Adapter

`@prosto/platform-adapter-typeorm` provides a shared TypeORM 1.1 `DataSource`
for one Prosto Platform runtime. It is an `@alpha` adapter and is composed by
an application through `RuntimeBuilder`; platform core does not depend on
TypeORM.

## Install

Install the adapter and the one driver selected by application configuration:

```bash
npm install @prosto/platform-adapter-typeorm better-sqlite3
```

Use `pg` for PostgreSQL, `mysql2` for MySQL or MariaDB, and `mssql` for SQL
Server.

SQLite configuration keeps the driver-neutral `type: 'sqlite'` value and
requires `database`; SQLite URLs are not supported. The adapter maps this
dialect to `better-sqlite3` internally.

## Usage

```ts
import { RuntimeBuilder } from '@prosto/platform-core';
import { PlatformAdminTypeOrmAdapter } from '@prosto/platform-adapter-admin-typeorm';
import { FastifyHttpAdapter } from '@prosto/platform-adapter-fastify';
import { TypeOrmPersistenceAdapter } from '@prosto/platform-adapter-typeorm';

const runtime = new RuntimeBuilder().build({
  configDir: './config',
  environment: 'development',
  adapters: {
    admin: new PlatformAdminTypeOrmAdapter(),
    persistence: new TypeOrmPersistenceAdapter(),
    http: new FastifyHttpAdapter({ port: 3001 }),
  },
});

await runtime.start();
// Call runtime.stop() from the host's shutdown handler.
```

This composition also needs the administration configuration documented in
the [admin adapter README](../platform-adapter-admin-typeorm/README.md).
Production additionally requires a host restart capability. An optional
`platformPersistenceDescriptor` may be supplied to `build()` for platform-owned
entities and migrations; it is not required for adapter or module descriptors.

This example composes the runtime directly. When using the managed
[`@prosto/platform-app` host](../../platform-app/README.md), call
`handle.stop()` instead of `handle.runtime.stop()` to clean up process handlers.

The adapter has the fixed component ID `typeorm`. Its settings belong directly at
`adapters.typeorm`, without a second `typeorm` wrapper:

```json
{
  "adapters": {
    "typeorm": {
      "enabled": true,
      "type": "sqlite",
      "database": "./app_data/platform.sqlite"
    }
  }
}
```

Module packages are discovered from `platform.discoveryPath`. They register
their TypeORM descriptors during `init()`; modules are no longer supplied as a
`RuntimeBuilder` option.

`@prosto/platform-adapter-admin-typeorm` may consume this package's documented
public descriptor helpers and `TYPEORM_DATA_SOURCE_SERVICE_TOKEN` to implement
the required `platform-admin` adapter. It must not import TypeORM adapter
internals. The administration adapter registers its descriptor and consumes the
ready `DataSource` through its owner-scoped lifecycle context.

Use `createTypeOrmPersistenceDescriptor()` with explicit entity and migration
constructors during module `init()`. Resolve
`TYPEORM_DATA_SOURCE_SERVICE_TOKEN` only in `start()` or later. The token is
published after migrations and migration-lock release succeed and is removed when the persistence
adapter stops.

For server dialects, use either `url` or structured connection fields. In URL
mode the adapter forwards only the dialect and URL, not separate connection,
pool, timeout, schema, or driver options. In structured mode use `host`,
`username`, `database`, and optional `port` and `password`; `schema` is forwarded
only for PostgreSQL and `options` only for SQL Server. SQLite requires
`database` and rejects `url` and server-only fields (`host`, `port`,
`username`, `password`, `schema`, `poolSize`, `connectTimeoutMs`, `options`).

The adapter validates its own `adapters.typeorm` configuration before opening a
connection or collecting descriptors. Unknown fields, including the removed
`migrationsRun` option, are rejected. Core deliberately treats adapter
configuration as opaque and does not validate TypeORM settings.

### Alpha configuration migration

Move every legacy `persistence.typeorm` setting to `adapters.typeorm` and remove
the extra `typeorm` wrapper. `app_settings.local.json` accepts adapter-scoped
overrides only. Remove `migrationsRun`: pending migrations always run under the
adapter lock as part of the mandatory persistence barrier.

### Migration behavior and defaults

- `type` is required; `enabled: false` fails startup. Omitting `enabled` does not disable this required adapter.
- Schema synchronization is always disabled. Pending migrations always run under the adapter's lock.
- `migrationLockTimeoutMs` defaults to `60000`; `migrationTransactionMode` defaults to `each` (`all`, `each`, and `none` are the public modes).
- File-backed SQLite uses `BEGIN EXCLUSIVE` and passes `transaction: 'none'` to TypeORM because the lock is itself a transaction. In-memory SQLite bypasses the database lock and uses the configured transaction mode.
- `poolSize` and `connectTimeoutMs` are forwarded for structured server connections; otherwise driver defaults apply.
- Relative SQLite paths are resolved by the driver against the process working directory, not `configDir`.

The complete consumer flow, safe local configuration template, platform
descriptor, discovered module package, and module descriptor are available in
[`examples/typeorm-shared-datasource`](../../../examples/typeorm-shared-datasource).
For the shared-database production administration composition, including the
administration adapter migrations and replica-safe state, see
[`examples/admin-production`](../../../examples/admin-production/README.md).

The required adapter architecture is described in
[ADR 0001](../../../docs/adr/0001-required-runtime-adapters.md).

## Public API

### Classes

- `TypeOrmPersistenceAdapter` - implements `IPersistenceRuntimeAdapter`; owns descriptor collection and the shared `DataSource` lifecycle

### Utilities

- `createTypeOrmPersistenceDescriptor({ entities, migrations })` - builds an adapter-owned descriptor payload for module registration
- `getTypeOrmPersistenceDescriptorPayload(descriptor)` - checks that entity and migration arrays exist and extracts the payload; full metadata validation occurs during collection
- `collectValidatedTypeOrmMetadata(descriptors, dialect)` - collects and validates entities and migrations across all registered descriptors

### Tokens

- `TYPEORM_DATA_SOURCE_SERVICE_TOKEN` - typed service token for the ready shared `DataSource` (valid only after adapter startup)

### Interfaces

- `ITypeOrmPersistenceConfig` - driver-neutral TypeORM persistence settings (dialect, host, port, database, credentials, pool, migration transaction mode)
- `ITypeOrmPersistenceDescriptorPayload` - TypeORM-specific descriptor payload (`entities`, `migrations`)
- `IMigrationLock` - dialect-specific database migration lock (`acquire`/`release`)
- `IMigrationLockFactoryInterface` - factory for creating migration lock instances

### Error Codes

Registry and startup failures use SDK `PersistenceError` codes. The exported
metadata validator can also throw `TypeOrmDescriptorValidationError`; startup
maps that error to `PersistenceDescriptorValidationFailed`. Relevant codes:

- `PersistenceRegistryNotCollecting` - descriptor registered after collection sealed
- `PersistenceDescriptorOwnerMismatch` - descriptor owner does not match the registering owner scope
- `PersistenceDuplicateDescriptor` - duplicate descriptor for the same owner
- `PersistenceDescriptorValidationFailed` - invalid entity or migration metadata
- `PersistenceMigrationLockTimeout` - database lock acquire timed out
- `PersistenceDriverUnavailable` - peer driver package not installed
- `PersistenceInitializationFailed` - DataSource initialization failure
- `PersistenceMigrationFailed` - migration execution failure

## Commands

Run from the repository root. Build the SDK first with
`npm run build --workspace=@prosto/platform-sdk` before direct adapter commands
on a clean checkout; direct workspace scripts do not build dependencies.

- `npm run --workspace @prosto/platform-adapter-typeorm build`
- `npm run --workspace @prosto/platform-adapter-typeorm typecheck`
- `npm run --workspace @prosto/platform-adapter-typeorm test`
- `npm run --workspace @prosto/platform-adapter-typeorm test:integration` (sets `PROSTO_TYPEORM_INTEGRATION=1` itself and runs the full suite, including integration tests)

Integration tests require `PROSTO_TYPEORM_DIALECT` (`postgres`, `mysql`,
`mariadb`, `sqlite`, or `mssql`). SQLite also requires
`PROSTO_TYPEORM_SQLITE_DIRECTORY`; server dialects require `<DIALECT>_HOST`,
`<DIALECT>_PORT`, `<DIALECT>_DATABASE`, `<DIALECT>_USERNAME`, and
`<DIALECT>_PASSWORD`, using the uppercase dialect name. `<DIALECT>_OPTIONS` is
optional JSON. Use an isolated test database, not a production database.
