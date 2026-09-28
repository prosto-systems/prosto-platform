# @prosto/platform-app

`@alpha` application composition root for one platform host per Node.js process.
It is neither the micro-core nor a discoverable module. It composes the required
adapters under [ADR 0001](../../docs/adr/0001-required-runtime-adapters.md),
starts the runtime, and owns process signals, restart, and shutdown. The SDK
provides neutral adapter contracts; core does not depend on this package or on
its concrete adapters.

## API

`startPlatformApp(options): Promise<IPlatformAppHandle>` requires an absolute
`configDir`. Options may pass `environment`, `commandLineArgs`, `correlationId`,
`platformPersistenceDescriptor`, and synchronous `configureServices` through
to `RuntimeBuilder`. The handle exposes `runtime` for reports and probing-folder
invalidation, `url?: URL` for the Fastify preset only, and idempotent
`stop(): Promise<void>`. Always call `handle.stop()` instead of
`handle.runtime.stop()` so signal handlers and the process host reservation are
cleaned up. A second concurrent host in the same process is rejected; another
can start after the first has stopped.

## Preset

Without `adapters`, the preset uses `FastifyHttpAdapter`,
`TypeOrmPersistenceAdapter`, and `PlatformAdminTypeOrmAdapter`, binding to
`127.0.0.1:3001` by default. Set `host` and `port` to override the binding;
`staticSiteRootPath` optionally serves a built shell. All paths passed to the
API must be absolute. `PROSTO_TRUSTED_INGRESS_ADDRESSES` must be a non-empty JSON
array of trusted IP addresses or CIDR ranges; the preset never trusts arbitrary
forwarded headers. Explicit `PROSTO_TLS_CERTIFICATE_PATH` and
`PROSTO_TLS_PRIVATE_KEY_PATH` must be supplied together and take priority.
When `PROSTO_LOCALHOST=true` without explicit TLS paths, provide both absolute
`localhostCertificatePath` and `localhostPrivateKeyPath` for local PEM files.
Otherwise the preset does not configure TLS; terminate HTTPS at the trusted
ingress. The package does not ship certificates or a static shell.

The deployment still supplies PostgreSQL, the `pg` driver, adapter settings,
secrets, and built module artifacts. The preset does not create any of these.
See the [production admin example](../../examples/admin-production/README.md).

## Custom Adapters

Alternatively, pass exactly one each of the SDK admin, persistence, and HTTP
adapters in `adapters`. Preset-only host, port, static-site, and localhost PEM
options cannot be combined with custom adapters. In this mode this package
does not read trusted-ingress or TLS environment variables, and the custom HTTP
adapter is responsible for transport security. `handle.url` is undefined.

## Shutdown And Supervision

`SIGINT` and `SIGTERM` share the handle's shutdown path. An ordinary successful
stop sets exit code `0`; a rejected stop or shutdown report with issues sets
exit code `1` and rejects `handle.stop()` with a safe error. The built-in
`HOST_RESTART_CAPABILITY_SERVICE_TOKEN` requester waits 100 ms for an accepted
`202` response to flush, then stops via the same path and sets exit code `75`,
even if shutdown fails or a termination signal arrives during the delay.
Configure an external supervisor to replace the process on exit `75`; the
package does not launch a replacement process. A host that overrides or removes
the restart service token takes responsibility for its own restart behavior.
Startup and shutdown log only safe diagnostics, not raw errors or configuration.
