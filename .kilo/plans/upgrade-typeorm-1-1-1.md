# Upgrade TypeORM to 1.1.1

## Goal and decisions

- Upgrade every workspace declaration from `typeorm ^0.3.31` to `^1.1.1`.
- Replace the removed `sqlite3` driver with the latest TypeORM-compatible v12 release, `better-sqlite3 ^12.11.1` (v13 is outside TypeORM 1.1.1's peer range).
- Preserve the platform's driver-neutral public dialect value `type: 'sqlite'`; translate it to TypeORM's internal `type: 'better-sqlite3'` in the adapter.
- Reject `url` for the logical SQLite dialect and require `database`, matching `better-sqlite3`'s actual configuration contract.
- Preserve the existing staged dependency updates, including the `cross-env` change, while updating manifests and the lockfile.

## Implementation

1. Update dependency manifests and installation policy.
   - In `packages/platform-adapters/platform-adapter-typeorm/package.json`, set `typeorm` to `^1.1.1`; replace `sqlite3` with `better-sqlite3 ^12.11.1` in both `devDependencies` and optional `peerDependencies`, including the matching `peerDependenciesMeta` key.
   - In `examples/typeorm-shared-datasource/package.json`, set `typeorm` to `^1.1.1` and replace `sqlite3` with `better-sqlite3 ^12.11.1`.
   - In root `package.json`, replace the `sqlite3@6.0.1` `allowScripts` entry with `better-sqlite3@12.11.1`, because the v12 driver installs a native binary.
   - Run the root npm install workflow to regenerate `package-lock.json`; verify the workspace entries resolve the new ranges, TypeORM resolves to 1.1.1, the v12 SQLite driver is present, and obsolete direct `sqlite3` entries are removed without discarding other staged upgrades.

2. Adapt SQLite DataSource construction in `packages/platform-adapters/platform-adapter-typeorm/src/typeorm-persistence-provider.ts`.
   - Handle the logical `sqlite` dialect before the generic URL branch, reject a SQLite `url` or missing `database` with the existing structured configuration `PersistenceError`, and construct TypeORM options with `type: 'better-sqlite3'` and `database`.
   - Retain `sqlite` for platform configuration, metadata ownership checks, migration-lock selection, and transaction decisions.
   - Update unavailable-driver detection and remediation text to report `better-sqlite3` for the public `sqlite` dialect and recognize the TypeORM 1.x missing-driver message/package name.
   - Keep the existing DataSource lifecycle, migration locking, and all server-dialect mappings unchanged; the repository does not use TypeORM APIs removed in v1.

3. Align core boundary validation without leaking the driver package name.
   - In `packages/platform-core/src/runtime/schemas/platform-config.schema.ts`, make enabled `type: 'sqlite'` accept `database` only and reject `url`; keep the public `TypeOrmDialectType` union unchanged.
   - Add `packages/platform-core/tests/platform-config.schema.test.ts` coverage proving SQLite with `database` parses and SQLite with `url` fails, while server dialect URL behavior remains accepted.

4. Cover and document the adapter migration.
   - Extend the existing provider test in `packages/platform-adapters/platform-adapter-typeorm/tests/typeorm-persistence-provider.test.ts` to assert that public `type: 'sqlite'` produces an initialized DataSource whose internal options use `better-sqlite3`.
   - Add a provider boundary case showing direct SQLite `url` input fails during configuration and does not publish the DataSource token.
   - Retain the existing in-memory and file-backed SQLite migration/restart tests as behavioral regression coverage for the new synchronous driver.
   - In `packages/platform-adapters/platform-adapter-typeorm/tests/integration/dialect-certification.test.ts`, replace the deprecated `queryRunner.connection` access with `queryRunner.dataSource` before certifying TypeORM 1.x.
   - Update `packages/platform-adapters/platform-adapter-typeorm/README.md` so the installation example names `better-sqlite3` and states that logical `sqlite` configuration uses `database`, not `url`.

## Validation

1. Run `npm run typecheck --workspace=@prosto/platform-core`, `npm run typecheck --workspace=@prosto/platform-adapter-typeorm`, and `npm run typecheck --workspace=@examples/typeorm-shared-datasource`.
2. Run `npm run test --workspace=@prosto/platform-core` for configuration validation and `npm run test --workspace=@prosto/platform-adapter-typeorm` for in-memory/file-backed SQLite lifecycle and migrations.
3. Run the adapter's `test:integration` workspace script with `PROSTO_TYPEORM_DIALECT=sqlite` and a temporary `PROSTO_TYPEORM_SQLITE_DIRECTORY` to certify locking, migrations, restart, and cleanup with `better-sqlite3`.
4. Run `npm run build --workspace=@prosto/platform-adapter-typeorm` and `npm run build --workspace=@examples/typeorm-shared-datasource`.
5. Run repository gates `npm run lint`, `npm run format`, `npm run typecheck`, `npm run test`, and `npm run build` because TypeORM types are exposed through the adapter's public API.

## Rollout and failure handling

- No database/schema conversion is required: `better-sqlite3` reads the same SQLite files. The file-backed restart test is the migration/rollback safety check before release.
- A missing or blocked native driver install must continue to surface as `PersistenceDriverUnavailable` with `better-sqlite3` remediation; an initialization or migration incompatibility must retain the existing redacted `PersistenceError` behavior and must not publish the DataSource token.
- SQLite integration is mandatory and local. Re-run PostgreSQL, MySQL/MariaDB, and MSSQL certification when their existing environment credentials are available; no new database infrastructure is introduced by this change.

## Risks and boundaries

- TypeORM 1.x changes null/undefined query criteria to throw and removes deprecated APIs. The adapter itself does not use affected APIs, but its public DataSource token exposes TypeORM to consumers, so typecheck/build and existing behavior tests are required.
- `better-sqlite3` is a native dependency; the root allow-list and install result must be validated on the repository's supported Node 22 environment.
- Do not rename the platform/core `sqlite` dialect or introduce TypeORM imports into core; core changes are limited to rejecting the already unsupported SQLite URL shape.
