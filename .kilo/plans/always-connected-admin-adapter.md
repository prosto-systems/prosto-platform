# Always-Connected Admin TypeORM Adapter

## Status

As of **2026-09-11**, the required-adapter composition and unified lifecycle are
implemented. `IRuntimeBuilderOptions.adapters` requires admin, persistence, and
HTTP roles; the concrete implementations are `PlatformAdminTypeOrmAdapter`,
`TypeOrmPersistenceAdapter`, and `FastifyHttpAdapter`. Core owns startup barriers,
rollback, and reverse shutdown through SDK contracts. Admin is the reserved
`platform-admin` adapter, not a discovered module; configuration is scoped to
`adapters.platform-admin`. The admin API is required, local shell hosting is
optional, and maintenance does not change infrastructure readiness.

Current authorities: [required-adapter ADR](../../docs/adr/0001-required-runtime-adapters.md),
[core README](../../packages/platform-core/README.md), and
[admin adapter README](../../packages/platform-adapters/platform-adapter-admin-typeorm/README.md).
Evidence includes the required builder options, the three adapter classes, and
`platform-core/tests/runtime-builder-services.test.ts` cases for required
composition, lifecycle order, reverse stop, and failed-start service cleanup.
The original design and acceptance criteria below are preserved, not marked
fully verified. Tests were not rerun here; the separately identified
cross-replica rate-limit and broader production-admin coverage follow-ups are
not certified resolved by this documentation review.

## Goal

Replace the filesystem-discovered `@prosto/platform-module-admin` with the required `@prosto/platform-adapter-admin-typeorm` and make `RuntimeBuilder` own the lifecycle of the platform's admin, persistence, and HTTP adapters. Every runtime must fail fast unless all three adapters are supplied and start successfully. Preserve the micro-core dependency direction: core depends only on SDK contracts and never imports a concrete adapter.

This plan supersedes the discoverable-admin-module and outer-HTTP-host decisions in `.kilo/plans/admin-production-api.md`. Existing production admin API behavior, routes, database identities, authentication policy, plugin ABI, and shell separation remain unchanged unless stated below.

## Decisions

- `RuntimeBuilder` requires an adapter set with exactly one admin adapter, one persistence adapter, and one HTTP adapter. HTTP-less, persistence-less, and worker-only runtime starts are no longer supported.
- All required adapters are fatal independently of module startup policy. There is no optional-adapter mode in this change.
- Core receives implementations through SDK interfaces. It must not import admin, TypeORM, or Fastify packages.
- Move the current implementation to `packages/platform-adapters/platform-adapter-admin-typeorm` as `@prosto/platform-adapter-admin-typeorm`; retain its explicit TypeORM binding and public TypeORM-adapter dependency. Splitting persistence-neutral admin policy is out of scope.
- Use runtime component ID `platform-admin`, but do not synthesize a manifest or module envelope. Reserve that ID against discovered modules.
- Exclude admin from `startedModuleIds`, `/api/admin/modules`, dashboard module counts, module dependency ordering, plugin discovery, and module operations. Adapter startup diagnostics remain available separately.
- Move configuration from `modules.platform-admin` to `adapters.platform-admin`. Core supplies only that deep-readonly scoped value to the adapter, which performs Zod validation. Do not provide a legacy alias.
- Require a framework-neutral HTTP adapter contract, not Fastify specifically. Fastify is the first implementation.
- The admin API is mandatory; local serving of the Vue admin-shell SPA remains optional HTTP-adapter configuration.
- `/ready` remains an infrastructure lifecycle signal and is not changed to `503` by admin maintenance mode.
- Perform a direct breaking migration. Remove the old persistence-provider, outer `FastifyHttpApplication`, and discoverable admin-module composition APIs after updating all repository consumers.
- Preserve `/api/admin/**`, `/modules/**`, cookie semantics, `platform_admin_*` tables, migration history, audit event identities, and `platform-admin-state`; existing databases require no data migration.

## Lifecycle Contract

Use SDK-owned role-specific interfaces extending one `IPlatformRuntimeAdapter` contract:

- `IPersistenceRuntimeAdapter`: exposes the persistence descriptor registry and starts in the infrastructure barrier.
- `IPlatformAdminAdapter`: fixed component ID `platform-admin`, starts in the application barrier.
- `IHttpRuntimeAdapter`: exposes the endpoint registrar and starts in the transport barrier.

Each adapter implements `initialize(context)`, `start(context)`, and `stop(context)`. Initialization is declaration-only and must be transactional; start may consume services made ready by earlier barriers.

Startup order:

1. Build and validate platform configuration, adapter identities, adapter roles, duplicate IDs, and required public surfaces.
2. Discover, validate, copy, and load feature modules as today; reject a discovered `platform-admin` module ID.
3. Initialize persistence, HTTP, then admin adapters so descriptor/endpoint/service registries exist before admin declarations.
4. Initialize feature modules in dependency order.
5. Seal persistence descriptors and start the persistence adapter, including connection and migrations.
6. Start feature modules under the selected module startup policy.
7. Publish final runtime/module and admin-asset catalogs from successfully started feature modules.
8. Start the admin adapter: bind the ready `DataSource`, bootstrap state/user, bind request handling, and start workers.
9. Commit admin-owned endpoints/services only after successful admin start.
10. Start the HTTP adapter, activate all committed endpoint owners, configure optional shell hosting and probes, and listen.
11. Mark the runtime started only after the HTTP adapter is listening. Until then, transport-level lifecycle gating returns sanitized unavailable responses and `/ready` is not ready.

Shutdown and startup rollback use the reverse dependency order:

1. Mark runtime stopping and stop HTTP first, draining/cancelling in-flight requests.
2. Stop admin workers and unregister admin-owned services/endpoints.
3. Stop feature modules in reverse dependency order.
4. Stop persistence and dispose its connection.
5. Clear catalogs, scoped contributions, service registry, and event bus.

On any adapter initialization/start failure, rollback all owned contributions, stop every already-started component, never listen (or close transport if transport start partially succeeded), and emit sanitized adapter-specific diagnostics. Module `best-effort` behavior must not weaken this rule.

## Implementation Steps

1. **Record the breaking architecture decision and define SDK contracts first.**
   - Add `docs/adr/0001-required-runtime-adapters.md` documenting mandatory admin/HTTP/persistence composition, the loss of HTTP-less runtime support, dependency inversion, fixed lifecycle barriers, fatal adapter policy, TypeORM-specific admin packaging, and direct migration.
   - Add `@alpha` adapter lifecycle, role, contexts, component identity, adapter diagnostic, and scoped contribution contracts under `packages/platform-sdk/src/platform/adapters/`; export them from `@prosto/platform-sdk/platform`.
   - Define `IPlatformAdminAdapter`, `IPersistenceRuntimeAdapter`, and `IHttpRuntimeAdapter` in their administration/persistence/HTTP SDK surfaces, extending the common contract without framework or ORM implementation types.
   - Generalize HTTP and persistence ownership from module-only identities to `{ type: 'module' | 'adapter', id }`. Adapter contexts receive owner-scoped registrars rather than choosing arbitrary owner IDs.
   - Extend runtime startup/shutdown diagnostics with adapter lifecycle records without adding adapters to module arrays or module probe IDs.
   - Expose neutral server DTOs through a narrow `@prosto/platform-sdk/admin/http` package export so the server adapter does not load the Vue-bearing aggregate admin entry.
   - Add SDK runtime/type tests for required methods, role narrowing, immutable scoped config, component identities, adapter descriptor ownership, diagnostics, and server-safe subpath exports.

2. **Make `RuntimeBuilder` require and orchestrate all three adapters.**
   - Replace `persistenceProvider` and outer-host assumptions in `packages/platform-core/src/runtime/interfaces/runtime-builder-options.interface.ts` with a required `adapters` object containing `admin`, `persistence`, and `http` SDK contracts. Keep implementation dependencies out of core.
   - Add an adapter lifecycle orchestrator under `packages/platform-core/src/runtime/` (with interfaces/errors in standard subdirectories) that enforces the startup/rollback/stop sequence above and rejects missing roles, duplicate IDs, mismatched admin identity, and reused/invalid adapter instances before discovery side effects.
   - Refactor `runtime.builder.ts`, `platform-runtime.ts`, `bootstrap.coordinator.ts`, and the fixed bootstrap stages so module loading/initialization/start remain module-owned while persistence, catalog publication, admin start, and transport start occur at explicit barriers.
   - Add `adapters` to the platform configuration schema and configuration providers. Supply only `adapters[adapter.id]` to each adapter; never expose adapter configuration to module contexts. If configuration exists only at the matching `modules.<adapterId>` key, fail with an actionable sanitized misplaced-configuration error rather than silently consuming it.
   - Reserve `platform-admin` as a runtime component ID during manifest validation and keep it out of module envelopes, dependency graphs, runtime catalogs, readiness module IDs, and module counts.
   - Ensure transport can observe lifecycle status without recursively calling `runtime.start()`/`stop()`. `runtime.start()` now includes listen; `runtime.stop()` owns the complete reverse shutdown.
   - Add focused core tests with local SDK-only fake adapters, not concrete adapter package dependencies. Cover mandatory options, role/ID validation, exact lifecycle order, catalog-before-admin ordering, best-effort module failure followed by admin start, every failure barrier, rollback idempotency, reverse stop, repeated stop, and no-listen-on-failure.

3. **Generalize transactional contribution ownership.**
   - Extend the persistence descriptor registry to accept adapter ownership while retaining the single platform descriptor and existing module ownership rules. Admin descriptors must be removable before sealing when initialization fails.
   - Extend endpoint collection so module and adapter owners have isolated begin/commit/rollback scopes. Make committed scopes authoritative for Fastify activation instead of filtering only by `runtime.startedModuleIds`.
   - Reserve `/api/admin` and `/modules` for owner `{ type: 'adapter', id: 'platform-admin' }`; retain `/health` and `/ready` as transport-owned routes. Reject conflicting feature-module declarations deterministically regardless of initialization order.
   - Add owner-scoped service registration/removal for adapter contributions such as the request gate. Validate admin configuration before registration and guarantee rollback after every failed initialize/start path.
   - Test duplicate routes, forbidden namespaces, adapter/module owner isolation, commit visibility, failed-start rollback, persistence sealing, and service-token cleanup.

4. **Convert the TypeORM provider into the infrastructure adapter.**
   - Refactor `packages/platform-adapters/platform-adapter-typeorm` so `TypeOrmPersistenceAdapter` implements `IPersistenceRuntimeAdapter`; initialization exposes descriptor collection, start performs the existing seal/connect/migrate/service-publication work, and stop performs disposal.
   - Remove the old `TypeOrmPersistenceProvider` public composition API rather than retaining a compatibility wrapper. Keep TypeORM-specific descriptor helpers and the ready `DataSource` token public for the admin-TypeORM adapter.
   - Preserve platform/module descriptor behavior, migration locking, dialect support, and existing configuration semantics.
   - Update public API, README, unit tests, and dialect certification tests for lifecycle order, failed startup rollback, idempotent stop, adapter-owned descriptors, and service unpublication.

5. **Convert Fastify from outer application host to transport adapter.**
   - Replace `FastifyHttpApplication` with `FastifyHttpAdapter` implementing `IHttpRuntimeAdapter`. Remove `runtimeFactory` and recursive runtime lifecycle ownership from its options; receive the runtime/probe view and service resolver through lifecycle context.
   - Expose its transactional endpoint registrar to `RuntimeBuilder`, initialize transport internals without listening, resolve the request gate only after admin start, activate every committed endpoint scope, and listen only in the transport start barrier.
   - During the short bind-to-runtime-started transition, reject application routes with sanitized `503`; `/ready` remains not ready. Stop must close HTTP and cancel streams before downstream components stop.
   - Preserve trusted proxy handling, request limits, correlation IDs, response streaming/cancellation, static security/cache policy, optional SPA hosting, and infrastructure probes.
   - Update public exports/options/errors and adapter tests for standalone runtime ownership, committed adapter routes, reserved namespaces, no requests before runtime readiness, partial-listen cleanup, shutdown order, and all existing HTTP/security scenarios.

6. **Move the admin implementation to the required TypeORM adapter package.**
   - Move `packages/platform-modules/platform-module-admin` to `packages/platform-adapters/platform-adapter-admin-typeorm`, rename the package to `@prosto/platform-adapter-admin-typeorm`, add a root `src/index.ts`/`.` export, and expose `PlatformAdminTypeOrmAdapter` plus typed options. Remove `manifest.json`, `./platform`, module build entry, and module contract-test dependency.
   - Replace `PlatformAdminModule`/`IPlatformModuleContext` with the SDK admin-adapter lifecycle. `initialize()` validates `adapters.platform-admin`, registers the adapter-owned TypeORM descriptor, declares endpoints, and contributes the request gate transactionally. `start()` performs the existing database binding/bootstrap/workers after catalogs are final.
   - Import DTO schemas from `@prosto/platform-sdk/admin/http`; do not import core, Fastify, the shell, Vue, or discovered modules.
   - Keep the current TypeORM entities/migration/repositories and Nodemailer implementation in this concrete adapter. Document the allowed dependency on the public TypeORM adapter SPI and do not claim datastore neutrality.
   - Make worker shutdown await in-progress outbox delivery, cleanup, and restart-poller work before TypeORM disposal. Preserve current at-least-once email semantics.
   - Replace manifest/module conformance tests with adapter public-API and lifecycle tests. Cover scoped configuration, descriptor/endpoint/service ownership, config-before-registration, missing TypeORM service, production restart capability, catalog availability, bootstrap, start failure cleanup, graceful stop, and exclusion from module views.
   - Preserve all existing admin endpoint/security tests and external identities; adjust only lifecycle fixtures and imports.

7. **Migrate every repository composition root without compatibility shims.**
   - Update `examples/admin-production` to install/construct `PlatformAdminTypeOrmAdapter`, `TypeOrmPersistenceAdapter`, and `FastifyHttpAdapter`, pass them to `RuntimeBuilder`, and call only runtime `start()`/`stop()`. The restart requester must defer and invoke runtime stop once before setting the supervisor exit code.
   - Remove admin from `scripts/prepare-modules.mjs`; only genuine feature modules such as `module-test` remain discovery artifacts.
   - Move example settings and environment-variable documentation from `modules.platform-admin` to `adapters.platform-admin`. Keep secret placeholders only and document that the shell root is optional even though admin API transport is mandatory.
   - Update `examples/typeorm-shared-datasource` to supply all three required adapters and suitable non-secret development admin configuration. Its purpose remains shared TypeORM descriptor composition, now under the mandatory runtime profile.
   - Update every `RuntimeBuilder`, Fastify, and TypeORM consumer found in package tests/examples. Core tests use local neutral fakes so core never gains concrete adapter dev dependencies.
   - Update workspace dependencies and `package-lock.json`; remove the old admin module package and all discovery/build references.

8. **Align authoritative documentation and verify end to end.**
   - Update `README.md`, `AGENTS.md`, `.agents/rules/{architecture,monorepo,testing,security,observability}.md`, SDK/core/adapter READMEs, and `.kilo/plans/admin-production-api.md` to reflect required adapters, direct composition, lifecycle ownership, package placement, adapter-to-TypeORM public SPI, admin exclusion from modules, optional shell hosting, and infrastructure-only maintenance readiness.
   - State explicitly that `RuntimeBuilder` no longer supports an HTTP-less mode and that application code, not core, chooses concrete implementations.
   - Run focused `test`, `typecheck`, and `build` scripts for SDK, core, Fastify, TypeORM, admin-TypeORM, admin shell, and both runtime examples; run admin package contract-equivalent lifecycle/integration tests.
   - Run repository gates present in `package.json`: `npm run test`, `npm run test:contracts`, `npm run typecheck`, `npm run build`, `npm run lint`, and `npm run format`.
   - There is currently no checked-in `.github/workflows` directory; CI workflow creation is outside this migration, so report local gate results without claiming CI enforcement.

## Acceptance Scenarios

- TypeScript requires all three adapter roles, and runtime validation fails before discovery for missing, duplicate, malformed, or mismatched adapters.
- Omitting the former admin artifact from discovery has no effect because admin is directly composed; placing a `platform-admin` manifest in discovery is rejected as a reserved ID.
- Persistence connects/migrates before modules/admin consume the `DataSource`; catalogs contain final successfully started feature modules before admin starts; Fastify listens only after admin succeeds.
- Any admin, persistence, or HTTP adapter failure is fatal under both strict and best-effort module policies, performs complete reverse rollback, and leaves no endpoint, request gate, worker, database connection, or listening socket behind.
- Feature modules cannot claim `/api/admin`, `/modules`, `/health`, or `/ready`. Fastify activates committed admin and feature-module routes without a synthetic started module ID.
- `/api/admin/modules`, dashboard counts, runtime module catalogs, and readiness module IDs never contain `platform-admin`; existing feature-module order and plugin manifest order remain deterministic.
- Existing databases start without schema/data renames, and all existing auth, session, password-reset, audit, maintenance, restart, manifest, and plugin-asset flows retain their HTTP contracts.
- `adapters.platform-admin` follows existing file/environment/CLI precedence, is visible only to the admin adapter, and old `modules.platform-admin` configuration is not accepted as an alias.
- A runtime may omit local shell static hosting while still providing the mandatory admin API. When configured, shell SPA and asset behavior remain unchanged.
- Maintenance continues to exempt `/ready` and does not alter its infrastructure-only readiness result.
- Runtime stop closes HTTP first, awaits admin background work, stops modules, then disposes TypeORM; repeated stop remains safe.

## Explicit Non-Goals And Follow-Ups

- Do not split administration policy from TypeORM persistence in this migration.
- Do not add an optional/headless builder mode, compatibility wrappers, synthetic admin module, module restart endpoint, MFA/OIDC/user CRUD, or mandatory bundled shell hosting.
- Do not generalize core's admin-asset catalog into a generic artifact catalog in this change.
- The existing cross-replica count-then-insert rate-limiter race and broader production-admin test gaps remain separate correctness work unless a touched lifecycle test exposes them; do not claim this migration resolves them.
- Module service-registry isolation beyond protecting/rolling back adapter-owned contributions is a separate hardening task.
