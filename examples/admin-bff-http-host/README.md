# Admin BFF HTTP Host Example

Executable composition root that uses `RuntimeBuilder` and wires
`@prosto/platform-adapter-admin-bff` to `@prosto/platform-adapter-http`
without creating a dependency between the two adapter packages.

`PlatformAdminBffRuntimeHost` owns the platform runtime, creates the concrete
discovery, permission and diagnostics services, converts Admin BFF handlers
into SDK route registrations, rejects anonymous identities before BFF handlers
run, and registers platform health and readiness endpoints independently.

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

`installShutdownHandlers()` belongs to the runtime entry point and subscribes
to `SIGINT` and `SIGTERM`; it awaits `host.stop()` before exiting.

The executable entry point accepts `PROSTO_HTTP_HOST`, `PROSTO_HTTP_PORT`,
`PROSTO_CONFIG_DIR`, `PROSTO_ADMIN_SHELL_VERSION`, and optional
`PROSTO_ADMIN_BFF_MANIFESTS_JSON`. It deliberately resolves anonymous identity
until a dedicated authentication adapter is added, so Admin BFF routes return
`401` while platform health/readiness routes remain available.
