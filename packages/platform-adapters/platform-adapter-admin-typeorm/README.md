# @prosto/platform-adapter-admin-typeorm

`@prosto/platform-adapter-admin-typeorm` is the alpha, directly composed
production administration adapter for Prosto Platform. It owns credential
authentication, authorization, password resets, audit activity, shared
maintenance and restart policy, and the framework-neutral `/api/admin` and
authenticated `/modules/` endpoints. It is intentionally TypeORM-specific and
uses the SDK plus the public `@prosto/platform-adapter-typeorm` SPI, with
TypeORM, Nodemailer, and Zod runtime dependencies;
it does not import platform-core, Fastify, the admin shell, Vue, or modules.

## Host composition

Construct `PlatformAdminTypeOrmAdapter` and supply it as the required `admin`
adapter to `RuntimeBuilder`, alongside a `TypeOrmPersistenceAdapter` and an HTTP
runtime adapter. The runtime calls `initialize()`, commits its declared
endpoints and request gate only after a successful `start()`, and removes those
contributions during lifecycle rollback or shutdown. In production, register an
idempotent `IHostRestartCapability` before startup.

See [the production host](../../../examples/admin-production/README.md) for
the `configureServices` registration of
`HOST_RESTART_CAPABILITY_SERVICE_TOKEN` from `@prosto/platform-sdk/platform`,
and [ADR 0001](../../../docs/adr/0001-required-runtime-adapters.md) for
required adapter lifecycle ordering.

The fixed adapter ID is `platform-admin`. It is reserved against discovery and
is excluded from feature-module dependency ordering, module catalogs, dashboard
module counts, `/api/admin/modules`, and readiness module IDs. This package is
not a module: it has no manifest, `./platform` export, or module contract-test
surface.

The adapter requires a shared TypeORM `DataSource`. Its migrations create users,
opaque sessions, one-use password-reset records, SMTP outbox rows, audit rows,
rate-limit attempts, and the singleton maintenance/restart state. All replicas
must share this database and the same adapter artifacts.

## Configuration and deployment

Configure `adapters.platform-admin` with an HTTPS `allowedPublicOrigin`, optional
bootstrap administrator, secure cookie name/lifetime, HTTPS `resetUrlBase`, SMTP
settings, reset-token encryption key, rate-limit windows, outbox lease/retry
settings, restart polling interval, and `trustedIngressConfigured` flag. These
values are supplied to the adapter as its scoped `context.config` and are
schema-validated before any descriptor, endpoint, or service contribution. The
encryption key's decoded byte length is checked later during `start()`. In
production, secure cookies, SMTPS, trusted ingress, and a host restart
capability are mandatory. Configuration failures are sanitized; never log or
commit bootstrap, SMTP, database, encryption, or ingress secrets.

When the user table is empty, valid bootstrap credentials create one `admin`
user. A normalized-email unique constraint deduplicates concurrent startup using
the same normalized bootstrap email. Use identical bootstrap configuration on
all replicas; it does not guarantee a single user if replicas race with different
emails. Once any user exists, bootstrap creation is skipped and never overwrites
an account, but supplied bootstrap settings must still pass configuration validation.

### Required settings and defaults

The configuration object is strict and rejects unknown keys. Except for
`bootstrap`, `smtp.auth`, `cookie.lifetimeSeconds`, and
`trustedIngressConfigured`, the fields below are required:

| Setting                                      | Validation / default                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `allowedPublicOrigin`, `resetUrlBase`        | HTTPS URLs, including in development; configure the former as the browser origin without a path                  |
| `bootstrap`                                  | `displayName` (1-120 characters), `email`, `password` (12-128 characters); required at startup if no user exists |
| `cookie`                                     | `name`, `secure`; `lifetimeSeconds` defaults to `3600`, maximum `86400`                                          |
| `rateLimit.login`, `rateLimit.passwordReset` | `maxAttempts` (1-100), `windowSeconds` (1-86400)                                                                 |
| `outbox`                                     | `leaseSeconds` (1-3600), `maxAttempts` (1-20), `retryBaseSeconds` (1-3600)                                       |
| `resetTokenEncryptionKey`                    | Base64url-encoded 32-byte key; string length 40-512                                                              |
| `restartPollingIntervalSeconds`              | Integer 1-3600                                                                                                   |
| `smtp`                                       | `host`, `port` (1-65535), `from` email, `secure`; optional `auth` requires `user` and `password`                 |
| `trustedIngressConfigured`                   | Defaults to `false`; must be `true` in production                                                                |

`trustedIngressConfigured` is an assertion, not proxy configuration or a check of
the HTTP adapter. Configure the actual trusted peers separately in the host.
SMTP settings are validated at startup, but connectivity is exercised by the
outbox worker when sending mail, not by a startup delivery check.

Sessions are random opaque tokens persisted as digests. The cookie is
`HttpOnly`, `SameSite=Strict`, `Path=/`, host-only, and `Secure` in production;
its default absolute lifetime is one hour. State-changing public requests must
pass Origin validation. Authenticated mutations also require Origin validation
and `X-CSRF-Token`; authenticated GET manifest and plugin-asset requests do not.

## API

The JSON API uses the `/api/admin` prefix and sanitized errors of the form
`{ code, correlationId, fieldErrors? }`.

| Method  | Path                            | Authorization                        | Success                            |
| ------- | ------------------------------- | ------------------------------------ | ---------------------------------- |
| `POST`  | `/auth/login`                   | Valid Origin; email/password         | `200` session and cookie           |
| `GET`   | `/auth/session`                 | Session                              | `200` session or `401`             |
| `POST`  | `/auth/logout`                  | Session, Origin, CSRF                | `204` and cleared cookie           |
| `POST`  | `/auth/password-reset-requests` | Valid Origin, valid body, rate limit | `202` for known and unknown emails |
| `POST`  | `/auth/password-resets`         | Valid Origin; one-use token          | `202` and session revocation       |
| `GET`   | `/dashboard`                    | `dashboard:view`                     | `200`                              |
| `GET`   | `/platform/health`              | `health:view`                        | `200`                              |
| `GET`   | `/modules`                      | `modules:view`                       | `200`                              |
| `GET`   | `/activity`                     | `activity:view`                      | `200`                              |
| `GET`   | `/platform/manifest`            | `modules:view`                       | `200`, private/no-cache            |
| `PATCH` | `/platform/maintenance`         | `maintenance:manage`, Origin, CSRF   | `200`                              |
| `POST`  | `/platform/restart`             | `platform:restart`, Origin, CSRF     | `202`                              |

`GET` and `HEAD /modules/:moduleId/*` require only an authenticated session.
They serve an exact active catalog target with exactly one matching `v` query
parameter, private immutable caching, MIME/length/ETag metadata, and `nosniff`.
Undeclared, stale, traversal, or version-mismatched targets return sanitized
`404`. The adapter never registers `/api/admin/modules/:moduleId/restart`;
production roles do not receive `modules:restart`.

Expected error statuses are `400 validation_failed` or `invalid_reset_token`,
`401 unauthorized` or `invalid_credentials`, `403 forbidden`, `origin_invalid`,
or `csrf_invalid`, `404 not_found`, `415 unsupported_media_type`, `429
rate_limited`, `503 maintenance` or `service_unavailable`, and `500
internal_error`.

## Replicas, mail, and restart

Rate limits, maintenance, audit, sessions, reset records, and restart generation
are database-backed across replicas. Maintenance exempts `/api/admin`,
`/modules`, `/health`, and `/ready` (including their descendants). Other paths
are denied with `503 maintenance`, including `/`, shell navigation, and
`/assets/*` when hosted by the current Fastify adapter. Shell hosting is not an
exemption: a fresh shell load cannot be relied upon during maintenance. The
exempt readiness probe reports infrastructure runtime state independently of
the maintenance flag.

Password-reset mail is claimed through conditional database leases and retried
with bounded backoff. Delivery is at-least-once, so duplicate email after a
worker crash is possible. A raw reset token is encrypted only until delivery and
then erased; the stored digest remains one-use.

Platform restart atomically increments the shared generation and returns `202`.
Each old replica poller observes the increment and requests its host's local,
idempotent graceful shutdown once. An external supervisor must replace exited
replicas; replacement processes adopt the current generation and do not restart
again.

In development the host restart capability is optional. Without it no restart
poller is started, even though the restart endpoint can still increment the
generation and return `202`.

## Non-goals

User CRUD, MFA, OIDC, module install/update, module restart, remote artifact
acquisition, CORS, and cryptographic package provenance are not implemented.

## Scripts

Run from the repository root:

On a clean checkout, first build `@prosto/platform-sdk` and then
`@prosto/platform-adapter-typeorm` with their workspace `build` scripts. The
direct commands below do not build dependencies.

| Command                                                                | Purpose                                   |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| `npm run build --workspace=@prosto/platform-adapter-admin-typeorm`     | Build the package and declarations.       |
| `npm run typecheck --workspace=@prosto/platform-adapter-admin-typeorm` | Type-check the package.                   |
| `npm run test --workspace=@prosto/platform-adapter-admin-typeorm`      | Run adapter lifecycle and endpoint tests. |
