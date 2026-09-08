# Production Admin Example

`@examples/admin-production` is a production-oriented composition root for the
admin API. It discovers built `platform-admin` and `module-test` artifacts,
hosts the built `@prosto/platform-admin-shell` SPA, and uses PostgreSQL through
the shared TypeORM provider.

Run from the repository root:

```bash
npm run typecheck --workspace=@examples/admin-production
npm run start --workspace=@examples/admin-production
```

`start` builds the SDK, core, adapters, admin module, module-test artifact, and
admin shell. It then copies only each module's `manifest.json`, `package.json`,
and built `dist/` directory to `modules/`. `RuntimeBuilder` discovers those
artifacts and refreshes its separate `app_data/modules/` probing directory; the
host never injects module instances.

## Localhost Production Run

Run the complete production composition locally with:

```bash
npm run start:localhost --workspace=@examples/admin-production
```

The command builds the artifacts, creates an ignored 30-day self-signed
certificate in `certificates/`, and listens at `https://localhost:3001`. The
first browser visit requires accepting the local certificate warning. It uses
the ignored `app_settings.production.json`, a local SQLite database at
`app_data/admin-production.sqlite`, and creates the local bootstrap account
`admin@localhost.test` with password `LocalhostAdminPassword!2026` only when the
database has no users. These local values must never be deployed.

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

The admin module requires an HTTPS `allowedPublicOrigin` and `resetUrlBase`, a
secure host-only cookie, SMTPS, a reset-token encryption key, rate-limit/outbox
settings, and `trustedIngressConfigured: true` in production. Bootstrap
credentials create exactly one administrator only while the user table is empty;
they neither overwrite an existing account nor belong in committed files.

## HTTP Security And Operations

The Fastify host serves the shell and `/api/admin` from one origin. It applies a
same-origin CSP, `nosniff`, referrer, and frame protections. Verify the built
shell and plugin assets under the production CSP before deployment and do not
enable arbitrary CORS or trust arbitrary forwarded headers.

Login and password-reset attempts are database rate-limited across replicas.
Reset requests always return an accepted response, store only a reset-token
digest, and queue the raw token encrypted for SMTP delivery. The leased outbox
is at-least-once: a process crash can produce a duplicate email, but tokens are
one-use and sessions are revoked after a successful reset.

Maintenance is stored in the shared database. While enabled, business requests
receive sanitized `503 maintenance`; `/api/admin`, `/modules`, `/health`,
`/ready`, and shell routes remain available for recovery. The exempt readiness
probe continues to report infrastructure runtime state independently of the
administration maintenance flag.

## Replicas And Restart

Every replica must use the same PostgreSQL database, the same module artifacts,
and the same deployment configuration. Run each replica under an external
supervisor. The restart capability waits briefly for the accepted `202` response
to flush, stops Fastify and the runtime once, then sets exit code `75`. Configure
the supervisor to create a replacement process for exit code `75`; a replacement
adopts the current restart generation and does not restart again.

`SIGINT` and `SIGTERM` perform ordinary graceful shutdown with exit code `0`.
