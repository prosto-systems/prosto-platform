# @prosto/platform-module-admin

`@prosto/platform-module-admin` is the alpha, discoverable production
administration module for Prosto Platform. It owns credential authentication,
authorization, password resets, audit activity, shared maintenance and restart
policy, TypeORM persistence, and the framework-neutral `/api/admin` and
authenticated `/modules/` endpoints. It depends on SDK and the public TypeORM
adapter API, never on platform-core or Fastify.

## Host composition

Discover the built package from `platform.discoveryPath`; do not inject its
module class into `RuntimeBuilder`. The host must compose a
`TypeOrmPersistenceProvider`, `FastifyHttpApplication`, the built admin shell,
and in production an idempotent `IHostRestartCapability`. See
[`examples/admin-production`](../../../examples/admin-production/README.md) for
the complete composition.

The module requires a shared TypeORM `DataSource`. Its migrations create users,
opaque sessions, one-use password-reset records, SMTP outbox rows, audit rows,
rate-limit attempts, and the singleton maintenance/restart state. All replicas
must share this database and the same module artifacts.

## Configuration and deployment

Configure `modules.platform-admin` with an HTTPS `allowedPublicOrigin`, optional
bootstrap administrator, secure cookie name/lifetime, HTTPS `resetUrlBase`, SMTP
settings, reset-token encryption key, rate-limit windows, outbox lease/retry
settings, restart polling interval, and `trustedIngressConfigured` flag. In
production, secure cookies, SMTPS, trusted ingress, and a host restart
capability are mandatory. Configuration failures are sanitized; never log or
commit bootstrap, SMTP, database, encryption, or ingress secrets.

When the user table is empty, valid bootstrap credentials create one `admin`
user. A normalized-email unique constraint makes concurrent replica startup
safe. Once any user exists, bootstrap values are ignored and never overwrite an
account.

Sessions are random opaque tokens persisted as digests. The cookie is
`HttpOnly`, `SameSite=Strict`, `Path=/`, host-only, and `Secure` in production;
its default absolute lifetime is one hour. State-changing public requests must
pass Origin validation. Authenticated mutations also require Origin validation
and `X-CSRF-Token`; authenticated GET manifest and plugin-asset requests do not.

## API

All API responses use the `/api/admin` prefix and sanitized errors of the form
`{ code, correlationId, fieldErrors? }`.

| Method | Path | Authorization | Success |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Valid Origin; email/password | `200` session and cookie |
| `GET` | `/auth/session` | Session | `200` session or `401` |
| `POST` | `/auth/logout` | Session, Origin, CSRF | `204` and cleared cookie |
| `POST` | `/auth/password-reset-requests` | Valid Origin | `202` for known and unknown emails |
| `POST` | `/auth/password-resets` | Valid Origin; one-use token | `202` and session revocation |
| `GET` | `/dashboard` | `dashboard:view` | `200` |
| `GET` | `/platform/health` | `health:view` | `200` |
| `GET` | `/modules` | `modules:view` | `200` |
| `GET` | `/activity` | `activity:view` | `200` |
| `GET` | `/platform/manifest` | `modules:view` | `200`, private/no-cache |
| `PATCH` | `/platform/maintenance` | `maintenance:manage`, Origin, CSRF | `200` |
| `POST` | `/platform/restart` | `platform:restart`, Origin, CSRF | `202` |

`GET` and `HEAD /modules/:moduleId/*` require only an authenticated session.
They serve an exact active catalog target with exactly one matching `v` query
parameter, private immutable caching, MIME/length/ETag metadata, and `nosniff`.
Undeclared, stale, traversal, or version-mismatched targets return sanitized
`404`. The module never registers `/api/admin/modules/:moduleId/restart`;
production roles do not receive `modules:restart`.

Expected error statuses are `400 validation_failed` or `invalid_reset_token`,
`401 unauthorized` or `invalid_credentials`, `403 forbidden`, `origin_invalid`,
or `csrf_invalid`, `404 not_found`, `415 unsupported_media_type`, `429
rate_limited`, `503 maintenance` or `service_unavailable`, and `500
internal_error`.

## Replicas, mail, and restart

Rate limits, maintenance, audit, sessions, reset records, and restart generation
are database-backed across replicas. Maintenance blocks business paths but
exempts `/api/admin`, `/modules`, `/health`, `/ready`, and shell routes so an
administrator can recover the platform. The exempt readiness probe continues to
report infrastructure runtime state independently of the maintenance flag.

Password-reset mail is claimed through conditional database leases and retried
with bounded backoff. Delivery is at-least-once, so duplicate email after a
worker crash is possible. A raw reset token is encrypted only until delivery and
then erased; the stored digest remains one-use.

Platform restart atomically increments the shared generation and returns `202`.
Each old replica poller observes the increment and requests its host's local,
idempotent graceful shutdown once. An external supervisor must replace exited
replicas; replacement processes adopt the current generation and do not restart
again.

## Non-goals

User CRUD, MFA, OIDC, module install/update, module restart, remote artifact
acquisition, CORS, and cryptographic package provenance are not implemented.

## Scripts

Run from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run build --workspace=@prosto/platform-module-admin` | Build the package and declarations. |
| `npm run typecheck --workspace=@prosto/platform-module-admin` | Type-check the package. |
| `npm run test --workspace=@prosto/platform-module-admin` | Run module tests. |
| `npm run test:contracts --workspace=@prosto/platform-module-admin` | Run module contract tests. |
