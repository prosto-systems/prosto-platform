# ADR-0001: Require Runtime Adapter Composition

## Status

Accepted

## Context

The platform previously permitted composition without an HTTP host or
persistence provider, while the administration backend was discovered as a
feature module. A missing, malformed, or skipped administration package could
therefore leave a runtime running without its required administration API.
The outer HTTP host also owned the runtime lifecycle, which obscured startup
and rollback ordering.

## Decision

`RuntimeBuilder.build(options)` requires an `adapters` object with one adapter
for each runtime role:

- administration, with the fixed component ID `platform-admin`;
- persistence;
- HTTP transport.

All adapters implement SDK-owned, framework-neutral lifecycle contracts. Core
orchestrates their initialization, start, rollback, and stop, but imports no
concrete administration, ORM, or HTTP implementation. Adapter initialization
is declaration-only and transactional. Startup uses fixed barriers:

1. initialize persistence, HTTP, then administration adapters;
2. discover, validate, resolve, copy, and load feature modules, then initialize them;
3. start persistence, with the persistence adapter sealing its descriptors;
4. start feature modules and publish final catalogs;
5. start administration and commit its contributions;
6. start HTTP transport and listen.

Every adapter is mandatory and every adapter initialization or start failure is
fatal to startup, independent of the feature-module startup policy. Stop failures
are recorded while remaining shutdown steps continue. Rollback and shutdown
proceed in reverse dependency order: HTTP, administration, feature modules,
then persistence.
Adapters are runtime components, not modules: they do not appear in module
manifests, module dependency ordering, module catalogs, module probes, or
`startedModuleIds`.

Adapter hooks are `initialize(context)`, `start(context)`, and `stop(context)`,
each returning `void | Promise<void>`. Initialization receives owner-scoped
service, persistence, and HTTP contribution registrars. Start and stop receive
a runtime lifecycle view instead. Configuration is immutable and scoped to
`adapters.<adapterId>`. Module capabilities expose HTTP and persistence
declaration registrars during `init()` only; module HTTP registrations commit
after successful initialization, while adapter HTTP registrations commit after
successful adapter start. Neither commit activates the HTTP listener.

The administration implementation remains explicitly TypeORM-specific and is
packaged as `@prosto/platform-adapter-admin-typeorm` under
`packages/platform-adapters/`. This concrete adapter may depend on the public
TypeORM adapter SPI, but it must not be presented as persistence-neutral.

This is a direct breaking migration. The former persistence-provider,
outer-`FastifyHttpApplication`, and discoverable administration-module
composition APIs are removed after all repository consumers have moved to the
required adapter set. HTTP-less, persistence-less, and worker-only runtime
starts are no longer supported.

## Implementation Status

Required-adapter composition and lifecycle hardening are implemented in
`RuntimeBuilder`, `AdapterLifecycleOrchestrator`, and `PlatformRuntime`.
Composition validation rejects duplicate IDs, reused instances, incomplete
registrar surfaces, and every misplaced `modules.<adapterId>` entry before
adapter hooks or module discovery. Failed startup and normal shutdown share
best-effort cleanup in reverse dependency order. Every adapter initialization
or start failure rejects `start()` with its primary lifecycle error after
cleanup, while publishing final failed startup and shutdown reports with
separate adapter diagnostics. Bootstrap-policy failures without an adapter
failure retain their report-based, non-started result.

The completed implementation and its verification record are in the
[runtime adapter lifecycle hardening plan](../../.kilo/plans/runtime-adapter-lifecycle-hardening.md).

Contribution cleanup is scoped rather than a general resource transaction:
services are visible immediately upon registration. Failed adapter initialization
removes its descriptors, endpoints, and services; failed start removes endpoints
and services. Cleanup stops only successfully initialized adapters, including
those whose start failed, and removes endpoints/services even if stop throws.
Adapters must clean up resources acquired by an initialization that fails.

See the [core README](../../packages/platform-core/README.md) for operational
behavior and the [SDK README](../../packages/platform-sdk/README.md) for public
contracts. SDK imports use the published `/platform`, `/admin`, `/admin/http`,
and `/utils` subpaths; there is no SDK root export.

## Consequences

- Application composition roots select and construct concrete adapters.
- Core depends only on SDK contracts, preserving dependency inversion.
- Administration configuration is scoped to `adapters.platform-admin`; the
  former `modules.platform-admin` location is not a compatibility alias.
- The administration API is mandatory, while local static hosting of the Vue
  administration shell remains optional HTTP-adapter configuration.
- Existing administration routes, database tables, migration history, audit
  identities, authentication policy, and plugin ABI are preserved.
