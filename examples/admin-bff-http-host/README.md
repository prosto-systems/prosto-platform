# Admin BFF HTTP Host Example

Executable composition root that uses `RuntimeBuilder` and wires
`@prosto/platform-adapter-admin-bff` to `@prosto/platform-adapter-http`
without creating a dependency between the two adapter packages.

`PlatformAdminBffRuntimeHost` owns the platform runtime, creates the concrete
discovery, permission and diagnostics services, converts Admin BFF handlers
into SDK route registrations, rejects anonymous identities before BFF handlers
run, and registers platform health, readiness, and composition-owned session
routes before startup.

Lifecycle ordering is `runtime.start()` then `httpServer.start()`. Shutdown
first stops the HTTP listener and then calls `runtime.stop()`, preventing new
requests from reaching a stopping runtime.

## Commands

```bash
npm run --workspace @examples/admin-bff-http-host typecheck
npm run --workspace @examples/admin-bff-http-host test
npm run --workspace @examples/admin-bff-http-host build
npm run --workspace @examples/admin-bff-http-host start
```

`start` loads the local `.env` file through Node's `--env-file` option. Copy
`.env.example` before local execution, then inject
`ADMIN_BFF_OIDC_CLIENT_SECRET` and `ADMIN_BFF_SESSION_KEY_RING_JSON` through
the environment; these secrets are intentionally not present in `.env`.

`installShutdownHandlers()` belongs to the runtime entry point and subscribes
to `SIGINT` and `SIGTERM`; it awaits `host.stop()` before exiting.

The host requires `ADMIN_BFF_CONFIG_DIR`, bearer OIDC configuration
(`ADMIN_BFF_AUTH_ISSUER`, `ADMIN_BFF_AUTH_JWKS_URI`, and
`ADMIN_BFF_AUTH_AUDIENCES_JSON`), browser OIDC configuration, and a deployment
injected AES key ring. Optional host values are `ADMIN_BFF_HTTP_HOST`,
`ADMIN_BFF_HTTP_PORT`, `ADMIN_BFF_ADMIN_MANIFESTS_JSON`, and
`ADMIN_BFF_ADMIN_SHELL_VERSION`.

`ADMIN_BFF_CONFIG_DIR` contains deployment-owned `app_settings.json` and
optional `app_settings.local.json`. These files enable TypeORM and select the
connection/dialect. Core persistence environment overrides remain exclusively
under `PROSTO_PERSISTENCE__TYPEORM__...`; all host-owned settings use the
`ADMIN_BFF_` namespace. The OIDC client secret and
`ADMIN_BFF_SESSION_KEY_RING_JSON` are injected by the deployment secret manager
and are never stored in this example configuration.

The non-secret `app_settings.json` persistence shape is:

```json
{
  "persistence": {
    "typeorm": {
      "enabled": true,
      "type": "postgres",
      "host": "database.internal",
      "port": 5432,
      "database": "prosto_admin",
      "username": "prosto_admin",
      "synchronize": false,
      "migrationsRun": true
    }
  }
}
```

Deployment-local secret overrides belong in `app_settings.local.json` or the
existing `PROSTO_PERSISTENCE__TYPEORM__...` core environment override, not in
this example.

Browser use requires a same-origin HTTPS ingress or reverse proxy. Cookies are
always secure and CORS credentials are not configured by this host.
