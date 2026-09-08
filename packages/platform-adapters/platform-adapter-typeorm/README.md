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
import {
  TypeOrmPersistenceProvider,
} from '@prosto/platform-adapter-typeorm';

const runtime = new RuntimeBuilder().build({
  configDir: './config',
  persistenceProvider: new TypeOrmPersistenceProvider(),
  platformPersistenceDescriptor,
});
```

Module packages are discovered from `platform.discoveryPath`. They register
their TypeORM descriptors during `init()`; modules are no longer supplied as a
`RuntimeBuilder` option.

Use `createTypeOrmPersistenceDescriptor()` with explicit entity and migration
constructors during module `init()`. Resolve
`TYPEORM_DATA_SOURCE_SERVICE_TOKEN` only in `start()` or later. The token is
published after locked migrations succeed and is removed during provider
disposal.

For server dialects, use either `url` or structured connection fields. The two
forms cannot be combined. Structured PostgreSQL, MySQL, MariaDB, and SQL Server
configuration requires `host`, `username`, and `database`; `schema` is
PostgreSQL-only. SQLite requires `database` and rejects server connection
fields.

The complete consumer flow, safe local configuration template, platform
descriptor, discovered module package, and module descriptor are available in
[`examples/typeorm-shared-datasource`](../../../examples/typeorm-shared-datasource).
For the shared-database production administration composition, including the
discoverable `platform-module-admin` migrations and replica-safe state, see
[`examples/admin-production`](../../../examples/admin-production/README.md).

## Public API

### Classes
- `TypeOrmPersistenceProvider` - implements `IPersistenceProvider`; owns the shared `DataSource` lifecycle

### Utilities
- `createTypeOrmPersistenceDescriptor({ entities, migrations })` - builds an adapter-owned descriptor payload for module registration
- `getTypeOrmPersistenceDescriptorPayload(descriptor)` - extracts validated TypeORM metadata from a descriptor
- `collectValidatedTypeOrmMetadata(descriptors, dialect)` - collects and validates entities and migrations across all registered descriptors

### Tokens
- `TYPEORM_DATA_SOURCE_SERVICE_TOKEN` - typed service token for the ready shared `DataSource` (valid only after provider readiness)

### Interfaces
- `ITypeOrmPersistenceConfig` - driver-neutral TypeORM persistence settings (dialect, host, port, database, credentials, pool, migration transaction mode)
- `ITypeOrmPersistenceDescriptorPayload` - TypeORM-specific descriptor payload (`entities`, `migrations`)
- `IMigrationLock` - dialect-specific database migration lock (`acquire`/`release`)
- `IMigrationLockFactoryInterface` - factory for creating migration lock instances

### Error Codes
All persistence failures surface as `PersistenceError` with structured, redacted details:
- `PersistenceRegistryNotCollecting` - descriptor registered after collection sealed
- `PersistenceDescriptorOwnerMismatch` - descriptor owner does not match registering module
- `PersistenceDuplicateDescriptor` - duplicate descriptor for same module
- `PersistenceProviderNotReady` - native token resolved before provider readiness
- `PersistenceDescriptorValidationFailed` - invalid entity or migration metadata
- `PersistenceMigrationLockTimeout` - database lock acquire timed out
- `PersistenceDriverUnavailable` - peer driver package not installed
- `PersistenceInitializationFailed` - DataSource initialization failure
- `PersistenceMigrationFailed` - migration execution failure

## Commands
- `npm run --workspace @prosto/platform-adapter-typeorm build`
- `npm run --workspace @prosto/platform-adapter-typeorm typecheck`
- `npm run --workspace @prosto/platform-adapter-typeorm test`
- `npm run --workspace @prosto/platform-adapter-typeorm test:integration` (requires `PROSTO_TYPEORM_INTEGRATION=1` and dialect environment variables)
