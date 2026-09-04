# Shared TypeORM DataSource Example

This application composes `RuntimeBuilder`, `TypeOrmPersistenceProvider`, a
platform descriptor, and a filesystem-discovered `module-order` package against
a local SQLite database through TypeORM 1.1 and `better-sqlite3`.

```bash
npm run typecheck --workspace=@examples/typeorm-shared-datasource
npm run start --workspace=@examples/typeorm-shared-datasource
```

The `start` script first builds `modules/module-order` and both publishable
adapters, then starts the application. `src/index.ts` composes
`FastifyHttpApplication`, `RuntimeBuilder`, `TypeOrmPersistenceProvider`, the
platform persistence descriptor, and a redacting `ConsoleModuleLogger`.

The discovered module registers its persistence descriptor and `GET
/api/orders` endpoint in `init()`. Requests resolve the ready shared
`TYPEORM_DATA_SOURCE_SERVICE_TOKEN` only after the module lifecycle has started.
The application listens on `http://127.0.0.1:3001/` and exposes these routes:

- `GET /health`: public infrastructure liveness probe.
- `GET /ready`: public infrastructure readiness probe.
- `GET /api/orders`: orders from the initialized SQLite data source.

`/health` and `/ready` are not the admin shell's
`/api/admin/platform/health`; this example does not provide a production admin,
authentication, authorization, or static-asset API. On `SIGINT` or `SIGTERM`,
the executable calls `application.stop()`, which closes HTTP before stopping the
runtime and shared `DataSource`.

The module package contains `manifest.json`, `package.json`, and a generated
`dist/platform/platform.module.js`. Its `./platform` package export is the entry
loaded from the probing directory. The example enables
`platform.refreshProbingFolderOnStart`, so every start copies the latest module
build to `app_data/modules/module-order` before loading it.

`config/app_settings.json` contains only non-secret SQLite settings. For a
deployment-local override, create `config/app_settings.local.json` from
`config/app_settings.local.example.json`; never commit the local file. A server
deployment may use that local override for its password or URL after changing
the safe dialect settings in `app_settings.json`.
