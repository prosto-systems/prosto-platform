# Runtime Adapter Lifecycle Hardening

## Status

**Historical implementation-completion record as of 2026-09-16.** Steps 1-6
are implemented. Step 7 was subsequently completed as a separate TypeORM
configuration migration slice.

### Verification

The following commands were run from the repository root on 2026-09-16:

- `npm run build --workspace=@prosto/platform-sdk` - passed;
- `npm run build --workspace=@prosto/platform-core` - passed;
- `npm run typecheck --workspace=@prosto/platform-core` - passed;
- `npm run test --workspace=@prosto/platform-core` - passed: 7 files, 57 passed,
  1 skipped;
- `npm run typecheck` - passed: 18 Turborepo tasks;
- `npm run lint` - passed;
- `npm run test` - passed: 16 Turborepo tasks;
- `npm run test:contracts` - passed: 8 Turborepo tasks.

Current authorities:

- [required runtime adapters ADR](../../docs/adr/0001-required-runtime-adapters.md);
- [core runtime README](../../packages/platform-core/README.md);
- [SDK contracts README](../../packages/platform-sdk/README.md).

## Goal

Make required-adapter validation, failed-startup cleanup, and diagnostics match
the architecture decision without changing the public adapter lifecycle API.
After this work, every startup attempt must have deterministic state, cleanup,
and reporting:

- invalid adapter compositions fail synchronously before composition side
  effects, while misplaced merged configuration fails before adapter hooks and
  discovery;
- every adapter initialization/start failure rejects `start()` after best-effort
  cleanup and leave a failed startup report;
- bootstrap policy failures keep the existing report-based non-started result;
- failed startup and normal shutdown use the same reverse dependency order;
- adapter diagnostics remain separate from module diagnostics and identifiers.

## Fixed Decisions

- Keep `IPlatformRuntimeAdapter`, required role interfaces, lifecycle contexts,
  and adapter diagnostics in `@prosto/platform-sdk/platform` unchanged. The
  current contracts already express the required behavior.
- Preserve the fixed startup barriers: initialize persistence, HTTP, and admin;
  initialize modules; start persistence; start modules; publish catalogs; start
  admin; start HTTP.
- Preserve exception semantics for adapter hook failures: `start()` rejects with
  the primary `RuntimeAdapterLifecycleError`. Cleanup failures must not replace
  that error.
- Preserve report semantics for a bootstrap-policy abort: `start()` resolves,
  `runtime.started` remains `false`, and `reports.startup.status` is `failed`.
- Reuse the normal shutdown path for failed-startup cleanup and publish its
  shutdown report. Rebuild the startup report afterward so it includes final
  adapter diagnostics while preserving the shutdown report.
- Reject every `modules.<adapterId>` entry, even when the corresponding
  `adapters.<adapterId>` entry exists. It is neither an alias nor tolerated
  compatibility input.
- Keep adapter configuration-placement validation in core, not in the general
  Zod module configuration schema, because valid feature-module IDs remain
  deployment-defined keys.
- Do not add compatibility wrappers for the removed provider/application APIs.

## Implementation Steps

### 1. Lock the behavior with failing tests

Add focused coverage in
`packages/platform-core/tests/runtime-adapter-lifecycle.test.ts` and reuse small
SDK-only fakes from existing core tests where practical.

Cover composition validation before `configureServices` or adapter hooks run:

- two distinct adapters with the same ID produce `DUPLICATE_ADAPTER_ID`;
- one object supplied in multiple role slots produces
  `REUSED_ADAPTER_INSTANCE` before role/ID mismatch reporting;
- missing or non-function persistence registry methods are rejected;
- missing or non-function HTTP registrar-provider methods are rejected;
- valid structurally conforming SDK fakes still build successfully;

Cover lifecycle-boundary validation before adapter hooks or discovery:

- `modules.<adapterId>` is rejected whether or not
  `adapters.<adapterId>` is present;
- a provider that throws from `createRegistrar()` becomes a failed adapter
  initialization;
- a returned persistence or HTTP registrar without callable `register` becomes
  a failed adapter initialization and rolls back every scope already created.

Cover every failed lifecycle barrier:

- persistence, HTTP, and admin initialization failure;
- persistence, admin, and HTTP start failure;
- adapter stop failure during rollback;
- module stop failure during rollback;
- application `onStopped` cleanup failure.

For each applicable barrier, assert:

- reverse cleanup order is HTTP, admin, modules, persistence;
- all eligible cleanup steps are attempted exactly once;
- only adapters whose `initialize()` completed receive `stop()`;
- an adapter whose `start()` failed is still stopped;
- the primary startup exception is preserved;
- runtime state is `started === false` and `stopped === true`;
- catalogs and owner-scoped endpoint/service contributions are cleared;
- `reports.startup` exists, is `failed`, and contains final adapter diagnostics;
- `reports.shutdown` exists and contains cleanup order and issues;
- no adapter ID appears in module arrays or `startedModuleIds`.

Retain and extend the existing normal-order and missing-discovery tests in
`packages/platform-core/tests/runtime-builder-services.test.ts`. Do not couple
core tests to concrete Fastify or TypeORM packages.

### 2. Correct composition and configuration validation

Update
`packages/platform-core/src/runtime/adapters/adapter-lifecycle-orchestrator.ts`:

- replace boolean use of `Set.add()` with explicit `Set.has()` checks followed
  by `add()`;
- check repeated object identity before role and duplicate-ID checks on later
  slots so reused-instance diagnostics are reachable and deterministic;
- validate the complete SDK-required function surface of
  `IPersistenceDescriptorRegistry` and `IHttpEndpointRegistrarProvider`, not
  property presence alone;
- create and validate both owner-scoped registrars inside the initialization
  `try` block; each returned registrar must be a non-null object with callable
  `register`, and partial scope creation must still roll back;
- keep the fixed `platform-admin` identity check and role checks;
- reject matching own keys in `modules.<adapterId>` unconditionally with
  `Object.hasOwn()`, including keys whose value is `undefined`.

Keep configuration-placement validation at the beginning of `initializeAll()`.
This preserves the current asynchronous `start()` boundary while still failing
before the first adapter hook and module discovery. Do not duplicate adapter
identity rules in `RuntimeBuilder`.

Do not tighten `platformConfigSchema.modules` globally: arbitrary kebab-case
feature-module configuration remains valid. Add placement tests at the builder
boundary rather than changing the schema test that proves this behavior.

### 3. Unify failed-startup cleanup

Refactor `packages/platform-core/src/runtime/platform-runtime.ts` around one
best-effort cleanup implementation shared by failed startup and normal shutdown,
with this order:

1. stop HTTP if it initialized;
2. stop admin if it initialized;
3. stop successfully started modules in reverse order;
4. stop persistence if it initialized;
5. dispose application-owned runtime services through `onStopped`;
6. clear runtime/admin catalogs and finalize runtime state.

The cleanup routine must:

- continue after every adapter, module, or service-cleanup failure;
- retain adapter stop outcomes in `AdapterLifecycleOrchestrator.diagnostics`;
- return sanitized module/platform cleanup issues for report construction;
- invoke `onStopped` at most once;
- set `_stopping` consistently while cleanup runs and clear it in `finally`;
- set `_stopped` even when cleanup has issues;
- never overwrite the primary startup exception.

Remove immediate cleanup and its fixed 60-second timeout from
`packages/platform-core/src/bootstrap/stages/modules-start.stage.ts`. Add an
internal `startedModules` collection to `IBootstrapStageContext` and
`IBootstrapContext`, populate it on success and abort, and assign
`PlatformRuntime._startedModules` from it. Loaded or initialized modules must not
be treated as successfully started modules.

Replace `stopAll()` usage from failed startup by reusing the complete normal
shutdown routine. Remove `stopAll()` if it has no remaining caller; otherwise
limit it to adapter-only orchestration and do not let it define runtime ordering.

Use `runtime.shutdownTimeoutMs` for module rollback, matching normal shutdown.
Do not introduce an adapter timeout in this change because the SDK currently
defines no cancellation or timeout contract for adapter hooks.

### 4. Make startup reporting total and final

Update the reporting flow in:

- `packages/platform-core/src/runtime/platform-runtime.ts`;
- `packages/platform-core/src/diagnostics/builders/report.base-builder.ts`;
- `packages/platform-core/src/diagnostics/builders/diagnostic-report.builder.ts`;
- the related internal diagnostics interfaces only where required.

Publish a preliminary failed startup report before cleanup, then rebuild it once
the final cleanup diagnostics are known. This gives lifecycle observers a failed
startup state during shutdown without retaining a stale adapter snapshot.

Status rules must be explicit:

- any failed required-adapter diagnostic makes startup `failed`;
- a fatal platform/bootstrap diagnostic makes startup `failed`;
- skipped feature modules without a fatal failure make startup `degraded`;
- otherwise startup is `success`.

Keep adapter failures only in `adapters`. Do not synthesize a fake feature module
for them. For an unexpected non-adapter exception before a bootstrap context is
available, add a sanitized platform diagnostic using a new core
`RuntimeErrorCodes.StartupFailed` value and `moduleId: "platform"`; never copy an
exception message or stack into the report.

Ensure all failure branches publish a final startup report:

- adapter initialization exception;
- unexpected bootstrap exception;
- bootstrap context with failed status;
- admin start exception;
- HTTP start exception.

`PersistenceInitializationStage` currently converts persistence start failure
into a bootstrap abort. Retain the first adapter initialization/start error in
`AdapterLifecycleOrchestrator.startupFailure`; after report construction and
cleanup, rethrow it so every required-adapter failure has the same external
semantics. Bootstrap policy aborts without an adapter failure continue to
resolve with a failed report.

The report must use the original startup timestamp and correlation ID and must
include adapter cleanup diagnostics recorded before publication. Keep
`degraded === false` for fatal adapter/platform failures unless feature modules
were independently skipped; `status` remains `failed` regardless.

Preserve the shutdown report when replacing the preliminary startup report:
`{ ...reports, startup: finalReport }`. `stopOrder` remains feature-module IDs;
adapter ordering stays in the separate adapter diagnostics array.

### 5. Verify package boundaries and integration behavior

Run focused checks from the repository root after building dependencies:

```bash
npm run build --workspace=@prosto/platform-sdk
npm run build --workspace=@prosto/platform-core
npm run typecheck --workspace=@prosto/platform-core
npm run test --workspace=@prosto/platform-core
```

Then run repository checks:

```bash
npm run typecheck
npm run test
npm run lint
```

Review imports and package manifests manually because the repository has no
dedicated architecture-boundary command. Confirm `platform-core` still imports
only SDK contracts and vetted runtime libraries, with no concrete adapter
dependency.

### 6. Close documentation gaps after implementation

Update the implementation-status and current-limitations sections in:

- `docs/adr/0001-required-runtime-adapters.md`;
- `packages/platform-core/README.md`;
- root `README.md`;
- `.agents/rules/architecture.md` and `AGENTS.md`.

Remove only limitations proven fixed by tests. Keep historical plans marked as
historical, and change this plan's status to implemented with the verification
commands and results actually run.

### 7. Complete adjacent audit follow-ups

Completed in the TypeORM configuration migration work following lifecycle
hardening. It did not require SDK lifecycle changes:

- The stale `register/init/start/stop` contract-test title was renamed to
  `init/start/stop`, and `npm run test:contracts` passed.
- The nested `module-order` example now directly depends on
  `@prosto/platform-adapter-typeorm` and `typeorm`, rather than relying on root
  dependency hoisting.
- The ignored `migrationsRun` option was removed from the TypeORM contract and
  deployment configuration. Pending migrations always run under the adapter
  lock at the required persistence barrier.
- The dead core `persistence.typeorm` path and its local-override support were
  removed. `app_settings.local.json` now accepts adapter-scoped overrides only,
  and the alpha migration to `adapters.typeorm` is documented.
- The TypeORM adapter now owns strict Zod validation of `adapters.typeorm`
  before connection or descriptor processing; core continues to treat
  adapter-scoped configuration as opaque SDK-neutral data.

Keep TypeORM configuration migration changes reviewable separately from
lifecycle hardening because removing the legacy path and ignored public option
is externally observable and requires focused adapter, core configuration, and
example tests.

## Acceptance Scenarios

- Invalid adapter identity, duplication, reuse, or registrar shape fails during
  `build()` before service configuration and lifecycle hooks.
- Legacy adapter configuration under `modules` always fails with
  `MISPLACED_ADAPTER_CONFIGURATION` and is never consumed.
- Each adapter initialization/start failure rejects with the original adapter
  ID and stage after all eligible cleanup is attempted.
- Failed-startup cleanup order matches the ADR and normal shutdown order.
- Cleanup failures do not mask the primary startup failure and are visible in
  sanitized diagnostics.
- Every `start()` attempt, including a rejected one, leaves final startup and
  shutdown reports with deterministic status and final adapter diagnostics.
- A failed startup cannot be restarted; repeated `stop()` remains safe.
- Adapter diagnostics never pollute module counts, catalogs, readiness module
  IDs, or `startedModuleIds`.
- Core unit tests use SDK-only fakes and introduce no adapter package dependency.

## Risks And Rollout

- Strict rejection of simultaneous old/new adapter configuration can break a
  deployment that currently relies on accidental tolerance. Treat the change as
  an intentional alpha contract correction and remove the legacy key before
  upgrade.
- Publishing reports for rejected startup attempts may expose assumptions in
  hosts that currently treat `reports.startup` as absent after exceptions. The
  report contains only sanitized data and should be additive to error handling.
- Persistence start changes from a resolved failed startup to a rejected
  `RuntimeAdapterLifecycleError`; this intentionally normalizes mandatory
  adapter failure semantics.
- Reordering rollback changes observable hook order. Adapters must already make
  `stop()` idempotent and tolerate being initialized but not started.
- Registrar shape validation must use only the public SDK interfaces; avoid
  concrete class checks that reject valid third-party adapters.
- Adding internal `startedModules` state to exported core bootstrap interfaces
  may affect custom core pipeline implementations. Document the field as
  internal and avoid changing SDK module or adapter contracts.
- Do not broaden this change into restartable runtime instances, adapter hook
  cancellation, metrics, remote module acquisition, or concrete adapter fixes.
