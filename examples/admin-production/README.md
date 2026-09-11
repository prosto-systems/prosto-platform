# Production Admin Example

`@examples/admin-production` is a production-oriented composition root for the
admin API. It directly composes `PlatformAdminTypeOrmAdapter`,
`TypeOrmPersistenceAdapter`, and `FastifyHttpAdapter`, discovers the built
`module-test` artifact, hosts the built `@prosto/platform-admin-shell` SPA, and
uses PostgreSQL through the shared TypeORM adapter.

Run from the repository root:

```bash
npm run typecheck --workspace=@examples/admin-production
npm run start --workspace=@examples/admin-production
```

`start` builds the SDK, core, required adapters, module-test artifact, and admin
shell. It then copies the feature module's `manifest.json`, `package.json`, and
built `dist/` directory to `modules/`. `RuntimeBuilder` discovers that artifact
and refreshes its separate `app_data/modules/` probing directory; the host never
injects module instances. It owns the complete adapter lifecycle through
`runtime.start()` and `runtime.stop()`.

## Localhost Production Run

Run the complete production composition locally with:

```bash
npm run start:localhost --workspace=@examples/admin-production
```

The command builds the artifacts and creates an ignored 30-day self-signed
certificate in `certificates/`. It does not create database, administration, or
SMTP configuration. First create the ignored
`config/app_settings.production.json` from the tracked example and replace its
placeholders. With valid localhost-oriented settings, the host listens at
`https://localhost:3001`; the first browser visit requires accepting the local
certificate warning. Local credentials and secrets must never be deployed.

For a deployed host that terminates TLS itself, set both
`PROSTO_TLS_CERTIFICATE_PATH` and `PROSTO_TLS_PRIVATE_KEY_PATH` to absolute
PEM paths. Otherwise, retain the default HTTP binding and terminate HTTPS at
the trusted ingress as described below.

## Deployment Configuration

Copy `config/app_settings.production.example.json` to
`config/app_settings.production.json` and replace every placeholder through the deployment secret mechanism. Do not commit bootstrap credentials, SMTP credentials, database
credentials, reset-token encryption keys, or ingress addresses.

Set `PROSTO_TRUSTED_INGRESS_ADDRESSES` to a non-empty JSON array of exact
trusted ingress addresses or CIDR ranges, for example
`["10.20.0.0/16", "2001:db8:42::/64"]`. The host binds only to `127.0.0.1:3001`;
terminate HTTPS at that trusted ingress. The example deliberately refuses to
start without this explicit allowlist and does not trust arbitrary forwarded
headers.

The committed configuration has no working database connection, bootstrap
account, encryption key, or SMTP settings. A fresh production database also
requires a bootstrap administrator. Missing or invalid settings fail startup
without logging their supplied values.

The admin adapter requires an HTTPS `allowedPublicOrigin` and `resetUrlBase`, a
secure host-only cookie, SMTPS, a reset-token encryption key, rate-limit/outbox
settings, and `trustedIngressConfigured: true` in production. Bootstrap
credentials create exactly one administrator only while the user table is empty;
they neither overwrite an existing account nor belong in committed files.

Place TypeORM settings at `adapters.typeorm` and admin settings at
`adapters.platform-admin`; `modules.platform-admin` is unsupported and never
used as an alias. Current core validation rejects that legacy location only when
the adapter-scoped entry is absent, so do not retain both entries. Environment
overrides use the same configuration tree. Because the adapter ID contains a
hyphen, provide its nested values with a JSON `PROSTO_ADAPTERS` object rather
than a split environment-variable path. Keep production secrets only in the
deployment secret mechanism.

## HTTP Security And Operations

The Fastify adapter serves the shell and `/api/admin` from one origin. Its
default CSP restricts resources to the same origin but currently permits
`'unsafe-eval'` for scripts and `'unsafe-inline'` for styles; it also applies
`nosniff`, referrer, and frame protections. Supply and verify a stricter CSP when
the deployed shell permits it. Do not enable arbitrary CORS or trust arbitrary
forwarded headers.

The local shell is optional: omit `staticSite.rootPath` when an external host
serves the SPA. The HTTP adapter and the admin API remain mandatory runtime
adapters in either deployment model.

Login and password-reset attempts are database rate-limited across replicas.
Reset requests always return an accepted response, store only a reset-token
digest, and queue the raw token encrypted for SMTP delivery. The leased outbox
is at-least-once: a process crash can produce a duplicate email, but tokens are
one-use and sessions are revoked after a successful reset.

Maintenance is stored in the shared database. While enabled, business requests
receive sanitized `503 maintenance`; `/api/admin`, `/modules`, `/health`,
and `/ready` remain available for recovery. Shell navigation, `/`, and
`/assets/*` are blocked by the current request gate. The exempt readiness probe
continues to report infrastructure runtime state independently of the
administration maintenance flag.

## Replicas And Restart

Every replica must use the same PostgreSQL database, the same module artifacts,
and the same deployment configuration. Run each replica under an external
supervisor. The restart capability waits briefly for the accepted `202` response
to flush, stops the runtime once, then sets exit code `75`. Configure
the supervisor to create a replacement process for exit code `75`; a replacement
adopts the current restart generation and does not restart again.

`SIGINT` and `SIGTERM` perform ordinary graceful shutdown with exit code `0`.
