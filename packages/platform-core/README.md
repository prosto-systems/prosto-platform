# @prosto/platform-core

`@prosto/platform-core` is the alpha runtime kernel for Prosto Platform. It
discovers local module packages, validates manifests and runtime compatibility,
resolves dependency order, maintains a probing directory, runs module
lifecycles, orchestrates required adapter barriers, and collects startup and
shutdown diagnostics.

The core depends on SDK contracts and does not depend on concrete adapters or
feature modules. Every `RuntimeBuilder` composition requires one administration,
persistence, and HTTP adapter. HTTP-less, persistence-less, and worker-only
runtime modes are unsupported; application code chooses concrete adapters.

## Requirements

- Node.js >= 22.23.0
- npm >= 10

## Usage

Build the runtime at the application boundary. Modules are discovered from the
configured filesystem path; they are not passed to `RuntimeBuilder`.

```ts
import { RuntimeBuilder } from '@prosto/platform-core';
import { PlatformAdminTypeOrmAdapter } from '@prosto/platform-adapter-admin-typeorm';
import { FastifyHttpAdapter } from '@prosto/platform-adapter-fastify';
import { TypeOrmPersistenceAdapter } from '@prosto/platform-adapter-typeorm';

const runtime = new RuntimeBuilder().build({
  configDir: './config',
  adapters: {
    admin: new PlatformAdminTypeOrmAdapter(),
    persistence: new TypeOrmPersistenceAdapter(),
    http: new FastifyHttpAdapter({ host: '127.0.0.1', port: 3001 }),
  },
});

await runtime.start();
console.log(runtime.reports.startup);
await runtime.stop();
```

This composition requires deployment configuration for the selected adapters,
including the shared database and administration security settings; constructor
defaults alone are not a complete production configuration. See the
[shared-datasource example](../../examples/typeorm-shared-datasource).

An application host may synchronously extend the core service registry through
`configureServices`. The callback runs once after registry creation and before
module contexts are created; asynchronous callbacks are rejected. This is the
generic composition seam for application-owned SDK services such as an
`IHostRestartCapability`, registered with
`HOST_RESTART_CAPABILITY_SERVICE_TOKEN` from `@prosto/platform-sdk/platform`.
Its `requestGracefulShutdown(): Promise<void>` implementation belongs to the
host and must be idempotent. The core supplies owner-scoped registrars to adapters;
it does not import Fastify, TypeORM, or another concrete implementation. The
HTTP adapter owns route activation, request mapping, probes, and listening at
the executable boundary.

The core also registers SDK-owned, sanitized administration catalogs before
module contexts are created. `IPlatformRuntimeCatalog` exposes immutable
platform/module identity and `healthy` or `degraded` status only;
`IAdminAssetCatalog` resolves an exact declared plugin asset to a one-shot Web
stream. Neither catalog exposes probing paths, configuration, or exception text.
The required administration adapter consumes these contracts after final feature
module catalogs are published. It is the reserved `platform-admin` runtime
component, not a discovered module; core does not implement authentication, HTTP
handlers, persistence, or static delivery.

The builder reads package defaults, then optional deployment files from
`configDir` (`app_settings.json`, environment-specific settings, and
`app_settings.local.json`). Environment variables with the `PROSTO_` prefix
and command-line arguments override file settings. When `configDir` is omitted,
deployment files are not read from the current working directory.

`app_settings.local.json` is a restricted override, not another general settings
file: it accepts adapter-scoped `adapters` overrides only. Adapter lifecycle
contexts use `adapters.<adapterId>`; `persistence.typeorm` is no longer a core
configuration path. This alpha migration requires moving legacy TypeORM settings
to `adapters.typeorm`; the TypeORM adapter validates that scoped data.

## Module package layout

The runtime recursively searches `platform.discoveryPath` for `manifest.json`
files and ignores any match below an `artifacts/` directory. A discovered
module package must have this minimum shape:

```text
modules/example-module/
|-- manifest.json
|-- package.json
`-- dist/
    `-- platform/
        `-- platform.module.js
```

The preferred `package.json` entry is:

```json
{
  "type": "module",
  "exports": {
    "./platform": "./dist/platform/platform.module.js"
  }
}
```

Modules that provide an admin plugin must additionally use explicit package
exports. `./admin` must name one `.js` or `.mjs` entry; styles use concrete
`./admin/styles/<name>` keys targeting `.css`; emitted chunks, images, and fonts
use concrete `./admin/assets/<name>` keys. Every target must be a regular,
non-symlink file below `dist/admin`. Wildcard targets, directories, condition objects,
fallback arrays, duplicate targets, dotfiles, maps, declarations, and inferred
admin filenames are rejected. The platform entry retains its documented loading
compatibility rules; these strict rules apply only to administration assets.
The copy-stage asset parser does require an object-valued `exports` when that
field exists, even for packages without admin assets. A string-valued root
`exports` is understood by the entry loader but rejected earlier by this parser;
prefer the `./platform` object form shown above.

The loader checks `exports["./platform"]` first, then the root `exports` import
or default condition, then `main`. If none is declared, it probes
`dist/platform/platform.module.js`, `dist/platform/index.js`, `dist/index.js`,
and `index.js` in that order. The ESM entry may export an `IPlatformModule`
instance or a zero-argument module class. Named factory functions whose names
start with `create`, `init`, `factory`, `build`, or `make` are also supported.

Remote URL and registry acquisition, archive extraction, checksums, and
in-memory module descriptors are not part of the current core loader.
Module ESM runs in-process, not in a sandbox. Deployment tooling must establish
package provenance and protect the discovery and probing directories.

## Module directories

Both paths are resolved relative to the process working directory:

| Setting                                | Default            | Behavior                                                                                                        |
| -------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `platform.discoveryPath`               | `./modules`        | Source tree scanned recursively for module manifests.                                                           |
| `platform.probingPath`                 | `app_data/modules` | Runtime cache from which platform entries are imported.                                                         |
| `platform.refreshProbingFolderOnStart` | `false`            | Copies validated module `dist/` directories and `package.json` files into the probing directory during startup. |

The probing directory is populated when it does not exist. If it already
exists and refresh is disabled, its current contents are reused. Set
`refreshProbingFolderOnStart` to `true` for development or call
`runtime.invalidateProbingFolder()` after installing or uninstalling a module.
Invalidation writes a `.rebuild` marker; the next startup removes the complete
probing directory and rebuilds it from validated discovery packages.
Ordinary startup refresh overwrites copied files without deleting stale files;
use invalidation for a clean rebuild. The copy stage returns early when there
are no validated modules, leaving any rebuild marker pending.

For required-adapter composition with shared persistence, see
[`examples/typeorm-shared-datasource`](../../examples/typeorm-shared-datasource).

## Runtime behavior

- `build(options)` checks required adapter roles, non-empty IDs, lifecycle
  methods, unique IDs and instances, the fixed administration ID, and complete
  persistence/HTTP registrar surfaces before discovery. It returns an unstarted runtime.
  The runtime initializes persistence, HTTP, then
  administration adapters; runs `discover`, `validate`, `resolve`, `copy`, and
  `load`; initializes feature modules; starts persistence; starts feature
  modules; publishes catalogs; starts administration; and starts HTTP listening
  last.
- Validation checks the manifest schema plus the manifest's `sdkVersion` and
  optional `nodeVersion` ranges against the runtime.
- Required dependencies determine a deterministic topological order. Optional
  dependencies do not create graph edges.
- Per-module discovery, validation, copy, and load failures skip the affected
  module and are recorded in diagnostics. Missing dependencies and lifecycle failures are
  additionally evaluated by the configured `strict` or `best-effort` startup
  policy. A missing discovery directory aborts startup; an existing empty
  directory permits an adapter-only runtime with no feature modules.
- `runtime.reports` exposes structured startup, shutdown, and operational
  diagnostics, with adapter lifecycle records separate from module arrays.
  Configured secret redaction is applied to diagnostic output.
- Any adapter initialization or start failure prevents successful startup
  regardless of module startup policy, rejects `start()` after cleanup, and
  publishes final failed startup and shutdown reports. A bootstrap-policy abort
  without an adapter failure instead resolves with `started === false` and a
  failed startup report.
- Call `stop()` during application shutdown. It owns the complete reverse
  shutdown: HTTP, administration, modules in reverse successful-start order,
  then persistence and runtime services. It is idempotent; a stopped runtime
  cannot be restarted. Module stop failures/timeouts and adapter stop failures
  are recorded while remaining cleanup continues. The configured
  `runtime.shutdownTimeoutMs` applies per module, not to adapter hooks.
- Module contexts expose `capabilities.http.endpoints` and
  `capabilities.persistence.descriptors` during `init()` only. Persistence state
  is `collecting` during initialization and `ready` during `start()`/`stop()`;
  later phases resolve persistence services through `context.services`.
- Module HTTP registrations commit after successful `init()` and roll back on
  failed `init()` or `start()`. Adapter HTTP registrations commit after
  successful adapter `start()`. Committing declarations does not start listening;
  the HTTP adapter activates transport last.
- Adapter configuration is exposed only as immutable
  `adapters.<adapterId>` data. Every module configuration entry matching an
  adapter ID is rejected at startup, even when matching adapter-scoped
  configuration exists. A discovered module ID `platform-admin` aborts
  validation.

### Contribution cleanup and lifecycle guarantees

Adapter `initialize()` receives owner-scoped service, persistence, and HTTP
registrars. `start()` and `stop()` receive a runtime lifecycle view instead of
the contributions object. Service registrations are immediately resolvable;
owner scoping provides cleanup, not deferred publication or a sandbox.
Failed initialization rolls back the owner's descriptors, endpoints, and
services. Failed start rolls back endpoints and services. An adapter whose
initialization succeeded is stopped during cleanup even if its start failed;
an adapter whose initialization failed is not stopped. Adapter stop removes its
endpoints and services in `finally`.

Failed startup uses the same best-effort reverse cleanup as normal shutdown:
HTTP, administration, successfully started feature modules in reverse order,
persistence, then application-owned runtime services. Every eligible step is
attempted once; cleanup failures are sanitized into the shutdown report and do
not replace the primary adapter lifecycle error. Module cleanup uses
`runtime.shutdownTimeoutMs` per module. A final failed startup report preserves
the original correlation ID and timestamp, includes adapter cleanup diagnostics,
and keeps adapter records separate from module diagnostics.

See the completed
[runtime adapter lifecycle hardening plan](../../.kilo/plans/runtime-adapter-lifecycle-hardening.md)
for regression scenarios and verification results.

Public core APIs are `@alpha` and may change in minor releases. Public module
and adapter contracts belong to `@prosto/platform-sdk`.

## Scripts

Run these commands from the repository root:

| Command                                               | Purpose                                      |
| ----------------------------------------------------- | -------------------------------------------- |
| `npm run build --workspace=@prosto/platform-core`     | Build the ESM package and type declarations. |
| `npm run typecheck --workspace=@prosto/platform-core` | Type-check the package.                      |
| `npm run test --workspace=@prosto/platform-core`      | Run the test suite once.                     |

Direct workspace commands require built workspace dependencies. Root Turborepo
build, test, and typecheck tasks order dependency builds automatically.
