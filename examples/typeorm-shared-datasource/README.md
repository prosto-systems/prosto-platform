# Shared TypeORM DataSource Example

This application composes the required `PlatformAdminTypeOrmAdapter`,
`TypeOrmPersistenceAdapter`, and `FastifyHttpAdapter` through `RuntimeBuilder`,
alongside a platform descriptor and a filesystem-discovered `module-order`
package against a local SQLite database through TypeORM 1.1 and `better-sqlite3`.

```bash
npm run typecheck --workspace=@examples/typeorm-shared-datasource
npm run start --workspace=@examples/typeorm-shared-datasource
```

The `start` script first builds `modules/module-order` and all required
publishable adapters, then starts the application. `src/index.ts` composes
`RuntimeBuilder`, the three adapters, and the platform persistence descriptor.
The runtime owns startup and shutdown through `runtime.start()` and
`runtime.stop()`.

The discovered module registers its persistence descriptor and `GET
/api/orders` endpoint in `init()`. Requests resolve the ready shared
`TYPEORM_DATA_SOURCE_SERVICE_TOKEN` only after the module lifecycle has started.
The application listens on `http://127.0.0.1:3001/` and exposes these routes:

- `GET /health`: public infrastructure liveness probe.
- `GET /ready`: public infrastructure readiness probe.
- `GET /api/orders`: orders from the initialized SQLite data source.

`/health` and `/ready` are not the admin adapter's
`/api/admin/platform/health`. The example provides the mandatory development
admin API but intentionally does not configure static shell hosting. Its
development-only `adapters.platform-admin` values are public fixtures, not
deployment credentials. On `SIGINT` or `SIGTERM`, the executable calls
`runtime.stop()`, which closes HTTP before stopping the runtime and shared
`DataSource`.

The module package contains `manifest.json`, `package.json`, and a generated
`dist/platform/platform.module.js`. Its `./platform` package export is the entry
loaded from the probing directory. The example enables
`platform.refreshProbingFolderOnStart`, so every start copies the latest module
build to `app_data/modules/module-order` before loading it.

`config/app_settings.json` contains non-secret development settings at
`adapters.typeorm` and `adapters.platform-admin`. For a deployment-local
override, create `config/app_settings.local.json` from
`config/app_settings.local.example.json`; the tracked example is intentionally
empty. Never commit the local file. A server deployment may place adapter
secrets there after changing the safe dialect settings in `app_settings.json`.
