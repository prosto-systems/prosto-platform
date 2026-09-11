# Production Admin API, Authentication, And Assets

## Status

As of **2026-09-11**, the original composition design is superseded by
[`always-connected-admin-adapter.md`](always-connected-admin-adapter.md).
This document records the earlier implementation plan. Its composition claims
about a discoverable `platform-admin` module, `TypeOrmPersistenceProvider`,
`FastifyHttpApplication`, and maintenance changing `/ready` are historical and
must not be used for current implementation or deployment decisions. The
required direct-composition model uses `PlatformAdminTypeOrmAdapter`,
`TypeOrmPersistenceAdapter`, and `FastifyHttpAdapter`; `RuntimeBuilder` owns
their lifecycle, while application code selects the concrete adapters.

Production auth, admin endpoints, protected plugin assets, and optional shell
hosting have implementations in the current adapters. Configuration is now
`adapters.platform-admin`; `/ready` reports infrastructure lifecycle state
independently of maintenance, and module restart remains unsupported.
Current authorities: [admin adapter README](../../packages/platform-adapters/platform-adapter-admin-typeorm/README.md),
[Fastify README](../../packages/platform-adapters/platform-adapter-fastify/README.md),
and [required-adapter ADR](../../docs/adr/0001-required-runtime-adapters.md).
Evidence includes `platform-admin-typeorm.adapter.ts`, its endpoint/services
implementation, and `fastify-http-adapter.ts`. The original steps and acceptance
scenarios below are historical, not an assertion that every security,
multi-replica, deployment, or test criterion has been verified. No runtime tests
were rerun for this documentation review.

## Goal

Implement the production backend required by `@prosto/platform-admin-shell`: built-in credential authentication, all currently advertised administration endpoints except module restart, trusted admin-plugin discovery/static delivery, and Fastify hosting of the shell SPA. Preserve the micro-core boundaries: SDK owns neutral contracts, core owns runtime/module metadata, Fastify owns HTTP/static lifecycle, and a new discoverable admin module owns feature policy and persistence.

## Decisions And Scope

- Add publishable `@prosto/platform-module-admin` at `packages/platform-modules/platform-module-admin` with module ID `platform-admin`; follow the standard publishable package layout and contract tests.
- Implement `login`, `session`, `logout`, password-reset request/completion, dashboard, protected platform health, module list, activity, platform restart, maintenance, manifest, and authenticated plugin assets. Do not register `/api/admin/modules/:moduleId/restart`; production roles do not receive `modules:restart`, so the existing shell control remains hidden.
- Use the shared TypeORM provider for users, sessions, reset tokens, mail outbox, audit activity, distributed rate-limit attempts, maintenance state, and restart generation. Support concurrent replicas sharing one database.
- Keep the existing roles `admin | operator | viewer` and permission matrix, minus `modules:restart`. User CRUD, MFA, OIDC, module install/update, and cryptographic package provenance remain out of scope.
- Bootstrap exactly one admin from validated deployment secrets when the user table is empty. Concurrent replicas rely on the normalized-email unique constraint. Never overwrite an existing user or log credentials.
- Password reset uses SMTP inside the module and a leased database outbox. Return the same accepted response for known and unknown addresses. Store only password hashes and reset-token digests; encrypt a queued raw reset token until its email is sent, then erase it.
- Sessions use opaque random cookies backed by the database. Cookie defaults are `HttpOnly`, `Secure` in production, `SameSite=Strict`, `Path=/`, no `Domain`, and a one-hour absolute lifetime. Store session and CSRF digests, rotate both on login, revoke the current session on logout, and revoke all user sessions after password reset.
- Validate `Origin` and CSRF for state-changing requests only. `GET /platform/manifest` requires a session and `modules:view`, but no CSRF header. Plugin assets require a valid session but no permission beyond authentication.
- Discover admin assets from explicit `package.json#exports`: `./admin` is the sole ESM entry; concrete `./admin/styles/<name>` keys expose CSS; concrete `./admin/assets/<name>` keys expose JS chunks, images, or fonts. Do not accept wildcard, directory, fallback-array, or conditional-object admin exports in v1.
- Preserve each export target's path in `/modules/<moduleId>/<target-without-leading-dot>` so relative JS/CSS references work. Only exact export targets are servable. Compute a SHA-256 version value, include it in the manifest, require the matching `v` query for immutable responses, and treat it as cache identity rather than package authenticity.
- Fastify serves the built admin-shell SPA, public fingerprinted shell assets, protected plugin assets, API endpoints, and SPA history fallback from one origin. HTTPS terminates at a trusted ingress; configure an explicit trusted-proxy allowlist rather than trusting arbitrary forwarded headers.
- Maintenance is shared across replicas and blocks business endpoints with sanitized `503 maintenance` responses. Exempt `/api/admin`, `/modules`, `/health`, `/ready`, and shell files/routes so administrators can recover the platform. `/ready` remains an infrastructure readiness signal and reports `503` while maintenance is enabled.
- Platform restart is deployment-wide: increment a database restart generation, return `202 { accepted: true }`, and let every replica's poller invoke an idempotent host-provided local graceful-restart capability. Each process closes Fastify/runtime and exits; its supervisor starts it again. A newly started replica adopts the current generation and does not restart again.
- SMTP outbox leasing, restart polling, and rate limiting must be safe across replicas. Delivery is at-least-once, so duplicate reset emails after a crash are acceptable; reset tokens remain one-use.

## Implementation Steps

1. **Define neutral SDK contracts first.**
   - Move the shell-local auth, dashboard, platform, maintenance, accepted-response, and sanitized admin error schemas/types into a new `platform-sdk/src/admin/http` surface; keep strict Zod validation and mark public exports `@alpha`.
   - Add neutral runtime administration contracts for immutable platform/module snapshots, module status, plugin descriptors, and an asset reader returning metadata plus a Web `ReadableStream<Uint8Array>`; publish typed service tokens for the runtime catalog and asset catalog.
   - Add an async HTTP request-gate contract/token with method, normalized pathname, and client address input, plus allow/deny output carrying a stable status/code. Add `remoteAddress` and trusted-proxy-derived protocol/host fields to `IHttpRequestContext` without exposing Fastify types.
   - Add the host restart capability/token. Its operation must be idempotent and request only local graceful shutdown; distributed generation remains admin-module policy.
   - Add SDK contract/type tests for valid DTOs, strict rejection, permissions, request metadata, gate decisions, catalog immutability, asset streams, and service-token typing. Update SDK indexes and public API JSDoc.

2. **Expose a safe runtime/module and admin-asset catalog from core.**
   - Introduce core implementations of the SDK catalog contracts and register them in `RuntimeBuilder` before module contexts are created. Keep physical paths private.
   - Retain validated metadata for started, failed, and skipped modules through bootstrap completion. Populate a sanitized snapshot with platform name/version, module ID/title/version, and `healthy | degraded` status; never expose exception text, probing paths, or configuration.
   - During package loading/copying, parse only explicit admin export keys. Require `./admin` to target a regular `.js`/`.mjs` file and style keys to target `.css`; allow support targets only for ESM chunks, images, and web fonts needed by the current build. Reject duplicate targets, unsupported MIME/extensions, dotfiles, maps/declarations/metadata, symlinks, non-files, and any target whose canonical realpath escapes that module's probing root or admin build subtree.
   - Publish plugin descriptors/assets only for successfully started modules and in lifecycle dependency order. Hash file bytes with SHA-256, build the existing `IAdminShellPluginInfo` shape, and make asset lookup exact by normalized URL path plus version query.
   - Remove or replace the unused `resolveAdminShellPluginEntryPath()` fallback so `package.json#exports` is the single authority; do not infer `admin.module.js`, `index.js`, or CSS filenames.
   - Add focused core tests for lifecycle status snapshots, started-module filtering/order, concrete export parsing, the real `admin.plugin.js` example, hash stability, stale probing files, traversal/encoded traversal, symlink escape, duplicate aliases, wildcards/conditional exports, unsupported files, and one-shot stream opening.

3. **Extend the Fastify adapter for trusted proxy metadata, request gating, and SPA hosting.**
   - Replace unsafe all-or-nothing production proxy trust with validated `trustedProxies` addresses/CIDRs and map effective protocol, host, and remote address into the SDK request context. Preserve a safe local-development default with no trusted proxy.
   - Resolve the optional SDK request gate after runtime startup and run it before endpoint handlers/body consumption. Return its sanitized denial response and correlation ID; fail closed with `503` for gate errors on business requests.
   - Add framework-neutral static-site options for an absolute admin-shell `rootPath`, index filename, SPA fallback, and security/cache policy. Use `@fastify/static` internally without exporting Fastify types.
   - Serve only regular files contained by the configured shell root: hashed `/assets/*` as public immutable, `index.html` as `no-cache`, and other shell files with revalidation. Apply SPA fallback only to `GET`/`HEAD` requests accepting HTML and never below `/api`, `/modules`, `/health`, or `/ready`.
   - Add `X-Content-Type-Options: nosniff`, referrer/frame protections, and a configurable production CSP compatible with the current native ESM/Vuetify shell (`default-src 'self'`, same-origin scripts/connect/fonts/images, and only the minimum style allowance verified by the built shell). Do not add CORS.
   - Ensure Web `Response` forwarding preserves `Set-Cookie`, streaming bodies, `HEAD`, content length/type, ETag, cache headers, cancellation, and correlation IDs.
   - Extend adapter tests for spoofed/trusted forwarding, request-gate exemptions/denials/errors, unread-body rejection, shell assets, SPA fallback exclusions, traversal/symlinks, headers, cache policy, `HEAD`, cookies, streamed plugin responses, and shutdown cancellation.

4. **Create the TypeORM-backed `platform-admin` module.**
   - Add root package/build/test/TypeScript configs, `manifest.json`, `./platform` export, standard `src/` subdivisions, and tests. Depend on SDK, the public TypeORM adapter API, TypeORM, Zod, and Nodemailer; do not import core or Fastify.
   - Register an owner-prefixed TypeORM descriptor during `init()` with explicit entities and portable timestamped migrations for `platform_admin_user`, `platform_admin_session`, `platform_admin_password_reset`, `platform_admin_mail_outbox`, `platform_admin_activity`, `platform_admin_rate_limit_attempt`, and singleton `platform_admin_state` (maintenance flag and restart generation). Add normalized-email/token uniqueness, expiration/query indexes, lease fields, and audit ordering indexes.
   - Validate `modules.platform-admin` configuration at startup: bootstrap email/display name/password, cookie name/lifetime/secure mode, allowed public origin, reset URL base, SMTP host/port/TLS/auth/from, reset-token encryption key, rate-limit windows, outbox lease/retry settings, and restart polling interval. Require HTTPS public/reset origins, secure cookies, SMTP TLS policy, encryption key, trusted ingress configuration, and restart capability in production; redact all secrets.
   - Use native `crypto.scrypt` with versioned salt/parameters for password hashes and `randomBytes` plus SHA-256/HMAC-safe constant-time comparisons for opaque session, CSRF, and reset tokens. Bound input sizes before expensive work and use a dummy password hash for unknown login emails.
   - Implement repository, domain service, authorization/CSRF/origin guard, cookie codec, rate limiter, audit writer, SMTP outbox worker, maintenance gate, and restart-generation poller as focused classes. Use transactions for one-use resets, session revocation, maintenance changes, and restart generation. Claim outbox rows with conditional leases so only one replica sends each attempt; retry with bounded backoff and retain only sanitized failure diagnostics.
   - Register the maintenance request gate service in `init()`, bind it to the ready shared DataSource in `start()`, start the leased SMTP/restart workers, and unregister/stop them in `stop()`. On a failed `start()`, clean up the gate registration before rethrowing.
   - Rate-limit login and reset requests across replicas using database attempt records keyed by privacy-preserving digests of effective client IP and normalized email. Return `429 rate_limited` without revealing account existence and periodically delete expired attempts/sessions/tokens/outbox records.

5. **Register the complete endpoint set except module restart.**
   - Build a module-local endpoint wrapper that validates session cookie, permissions, Origin, CSRF, and Zod input consistently and maps known failures to `{ code, fieldErrors?, correlationId }` without leaking internal errors.
   - Auth: implement `POST /api/admin/auth/login`, `GET /api/admin/auth/session`, `POST /api/admin/auth/logout`, `POST /api/admin/auth/password-reset-requests`, and `POST /api/admin/auth/password-resets`. Normalize email, use neutral reset responses, clear expired/invalid cookies, and emit security audit events for successes/failures/denials without credentials or raw tokens.
   - Read API: implement `/dashboard`, `/platform/health`, `/modules`, and `/activity` from shared sessions, state, runtime catalog, persistence/mail health, and latest bounded audit rows. Map unavailable/degraded modules to the shell's current schemas.
   - Manifest: implement `GET /api/admin/platform/manifest` from the core asset catalog with `modules:view`, deterministic plugin order, platform identity, no CSRF requirement, private/no-cache headers, and only started modules.
   - Plugin assets: implement `GET` and `HEAD /modules/:moduleId/*`; authenticate first, resolve an exact active catalog entry, require its generated version query, stream with exact MIME/length/ETag, `Cache-Control: private, max-age=31536000, immutable`, `nosniff`, and no directory listing or redirects. Return sanitized `404` for undeclared/stale/mismatched assets.
   - Operations: implement maintenance PATCH with `maintenance:manage`, distributed state update, readiness effect, and audit; implement platform restart POST with `platform:restart`, atomic generation increment, audit, and `202`. Do not register a module-restart route.
   - Add unit/integration tests using a real temporary SQLite DataSource for bootstrap races, all auth flows, secure cookie attributes, session expiry/revocation, CSRF/Origin, role permissions, reset non-enumeration, encrypted outbox leases/retries, one-use tokens, distributed rate limits, maintenance across two service instances, restart generation across two pollers, audit redaction, every endpoint response, plugin stream cancellation, and graceful stop.

6. **Align admin shell and module build contracts.**
   - Replace shell-local DTO schemas with SDK imports and remove the CSRF argument/header from manifest GET while retaining credentials and `modules:view` handling.
   - Keep module-restart UI permission-driven; because production never grants `modules:restart`, no production request is exposed. Document the endpoint as unsupported rather than pretending acceptance.
   - Fix manifest-load recovery so a failed request does not redirect to the same route indefinitely or permanently cache an empty plugin result. Permit a later authenticated navigation/retry to load the recovered manifest.
   - Make `AdminShell.registerPlugin()` rethrow registration callback failures so the loader reports `registration_failed`; remove styles loaded for an entry whose import/validation/registration fails. Add focused regression tests, without introducing plugin unload/hot-reload in this scope.
   - Update `examples/module-test/package.json` with explicit CSS/support export keys and update its integration fixture/manifest URLs. Keep runtime ABI v1 and the existing exact `registerAdminPlugin` ESM shape.

7. **Add a runnable multi-replica-capable composition example.**
   - Add an example host that composes `RuntimeBuilder`, `TypeOrmPersistenceProvider`, `FastifyHttpApplication`, the built shell path, explicit trusted ingress addresses, and an idempotent local restart requester. Discover the built `platform-admin` and `module-test` artifacts rather than injecting modules.
   - The local restart requester must defer shutdown until the `202` response can flush, call `application.stop()`, and set the supervisor-agreed exit code once. Document that all replicas share the same database and module build, and that an external supervisor is mandatory.
   - Provide safe example configuration placeholders only; do not commit bootstrap, SMTP, database, encryption, or proxy secrets. Ensure production startup fails with actionable redacted configuration errors when required values/capabilities are absent.

8. **Update authoritative documentation and verification.**
   - Update root/package READMEs and architecture boundary text from “unimplemented” to the implemented ownership model. Document package exports conventions, API permissions/status codes, secure deployment topology, CSP, trusted ingress, SMTP/outbox behavior, multi-replica semantics, maintenance exemptions, restart supervisor contract, and explicit non-goals. Update `AGENTS.md` only if root commands or required tooling change.
   - Run focused package tests/typechecks/builds for SDK, core, TypeORM adapter, Fastify adapter, admin module, admin shell, and both examples, then repository gates: `npm run test`, `npm run test:contracts`, `npm run typecheck`, `npm run build`, `npm run lint`, and `npm run format`.

## Acceptance Scenarios

- A fresh deployment with valid secrets creates one admin despite simultaneous replica startup; removing bootstrap secrets later does not affect the account. Invalid/missing production secrets fail startup without disclosure.
- Login sets a secure opaque cookie and returns principal/permissions/CSRF; reload restores from the shared DB; logout, expiry, password reset, and unauthorized responses revoke/clear state correctly across replicas.
- Login/reset brute force is limited across replicas. Unknown reset emails are externally indistinguishable from known emails, while a known account receives a one-use SMTP link through leased/retried outbox delivery.
- Authenticated shell navigation receives a deterministic manifest containing only admin exports from started modules. Declared JS/CSS/support assets load through protected same-origin URLs; unauthenticated, undeclared, stale, traversal, symlink, wrong-version, and platform-server files cannot be read.
- Fastify serves a hard-refreshed `/login` or plugin workspace route as the SPA, never masks API/module/probe 404s, and emits the expected CSP/security/cache headers behind only configured trusted ingress addresses.
- Enabling maintenance on one replica causes all replicas to reject business APIs and report not-ready while shell/admin/plugin/probe access remains available; disabling it restores traffic and both changes appear in activity.
- A platform restart request increments one shared generation, returns `202`, and causes every old replica to invoke local graceful shutdown once. Supervisor-created replacements adopt the new generation without looping.
- Dashboard, module list, health, and activity reflect runtime catalog, active sessions, maintenance, mail/persistence degradation, and sanitized audit data. Module restart remains unavailable and hidden.

## Risks And Rollout

- The SDK additions are `@alpha`; keep existing admin plugin ABI v1 unchanged. Moving shell DTO ownership is internal to the private shell but requires coordinated SDK/module/shell publication.
- Requiring explicit concrete admin exports is intentionally strict and may reject existing module packages. Update `module-test` first, fail module admin-asset publication with structured diagnostics, and never fall back to probing-directory enumeration.
- Database migrations and bootstrap creation run before HTTP listen. Test migrations on every supported TypeORM dialect; deploy migrations and the admin module before directing production traffic.
- Shared-DB request gating adds a query to business requests during maintenance enforcement. Correct cross-replica behavior takes priority in v1; observe latency and introduce a versioned notification/cache mechanism only later without weakening consistency.
- SMTP delivery is at-least-once and can duplicate a reset email after a worker crash. One-use token consumption and expiry prevent duplicate password changes.
- CSP must be validated against the actual production shell bundle and plugin assets before enforcement. Do not silently weaken it to `unsafe-eval` or cross-origin sources.
- Platform restart depends on a correctly wired host graceful-exit capability and external supervisor. Refuse to start the admin module in production if that capability is absent.
