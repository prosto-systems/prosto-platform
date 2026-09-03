# Shared TypeORM DataSource Example

This application composes `RuntimeBuilder`, `TypeOrmPersistenceProvider`, a
platform descriptor, and a filesystem-discovered `module-order` package against
a local SQLite database through TypeORM 1.1 and `better-sqlite3`.

```bash
npm run typecheck --workspace=@examples/typeorm-shared-datasource
npm run start --workspace=@examples/typeorm-shared-datasource
```

The `start` script first builds `modules/module-order`, then builds and starts
the application. `src/index.ts` supplies the platform persistence descriptor;
the discovered module registers its descriptor in `init()` and resolves
`TYPEORM_DATA_SOURCE_SERVICE_TOKEN` in `start()`. The example serves the startup
report at `http://127.0.0.1:3001/` and stops the runtime on `SIGINT` or `SIGTERM`
so the provider closes its shared `DataSource`.

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
