# @prosto/platform-core

`@prosto/platform-core` is the alpha runtime kernel for Prosto Platform. It
discovers local module packages, validates manifests and runtime compatibility,
resolves dependency order, maintains a probing directory, runs module
lifecycles, coordinates optional persistence initialization, and collects
startup and shutdown diagnostics.

The core depends on SDK contracts and does not depend on adapters or feature
modules. Compose an adapter, such as the TypeORM persistence adapter, in the
application's `RuntimeBuilder` options.

## Requirements

- Node.js >= 22.23.0
- npm >= 10

## Usage

Build the runtime at the application boundary. Modules are discovered from the
configured filesystem path; they are not passed to `RuntimeBuilder`.

```ts
import { RuntimeBuilder } from '@prosto/platform-core';

const runtime = new RuntimeBuilder().build({
  configDir: './config',
});

await runtime.start();
console.log(runtime.reports.startup);
await runtime.stop();
```

An application host may synchronously extend the core service registry through
`configureServices`. The callback runs once after registry creation and before
module contexts are created; asynchronous callbacks are rejected. This is the
generic composition seam used by HTTP hosts to provide the SDK endpoint
registrar. The core does not import Fastify or own listening, route activation,
request mapping, probes, or any other HTTP framework detail. Compose
[`@prosto/platform-adapter-fastify`](../platform-adapters/platform-adapter-fastify/README.md)
at the executable boundary instead.

The builder reads package defaults, then optional deployment files from
`configDir` (`app_settings.json`, environment-specific settings, and
`app_settings.local.json`). Environment variables with the `PROSTO_` prefix
and command-line arguments override file settings. When `configDir` is omitted,
deployment files are not read from the current working directory.

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

The loader checks `exports["./platform"]` first, then the root `exports` import
or default condition, then `main`. If none is declared, it probes
`dist/platform/platform.module.js`, `dist/platform/index.js`, `dist/index.js`,
and `index.js` in that order. The ESM entry may export an `IPlatformModule`
instance or a zero-argument module class. Named factory functions whose names
start with `create`, `init`, `factory`, `build`, or `make` are also supported.

Remote URL and registry acquisition, archive extraction, checksums, and
in-memory module descriptors are not part of the current core loader.

## Module directories

Both paths are resolved relative to the process working directory:

| Setting | Default | Behavior |
| --- | --- | --- |
| `platform.discoveryPath` | `./modules` | Source tree scanned recursively for module manifests. |
| `platform.probingPath` | `app_data/modules` | Runtime cache from which platform entries are imported. |
| `platform.refreshProbingFolderOnStart` | `false` | Copies validated module `dist/` directories and `package.json` files into the probing directory during startup. |

The probing directory is populated when it does not exist. If it already
exists and refresh is disabled, its current contents are reused. Set
`refreshProbingFolderOnStart` to `true` for development or call
`runtime.invalidateProbingFolder()` after installing or uninstalling a module.
Invalidation writes a `.rebuild` marker; the next startup removes the complete
probing directory and rebuilds it from validated discovery packages.

For a persistence-enabled composition, see
[`examples/typeorm-shared-datasource`](../../examples/typeorm-shared-datasource).

## Runtime behavior

- The bootstrap pipeline runs `discover`, `validate`, `resolve`, `copy`, `load`,
  `initialize`, `persistence`, and `start` in that order.
- Validation checks the manifest schema plus the manifest's `sdkVersion` and
  optional `nodeVersion` ranges against the runtime.
- Required dependencies determine a deterministic topological order. Optional
  dependencies do not create graph edges.
- Discovery, validation, copy, and load failures skip the affected module and
  are recorded in diagnostics. Missing dependencies and lifecycle failures are
  additionally evaluated by the configured `strict` or `best-effort` startup
  policy.
- `runtime.reports` exposes structured startup, shutdown, and operational
  diagnostics. Configured secret redaction is applied to diagnostic output.
- Call `stop()` during application shutdown to stop started modules in reverse
  lifecycle order and dispose core services.
- An HTTP host may expose `context.capabilities.http` only for `init()`. The
  core commits endpoint registrations after successful initialization and rolls
  them back after `init()` or `start()` failures, without knowing an HTTP
  framework.

Public core APIs are `@alpha` and may change in minor releases. Public module
and adapter contracts belong to `@prosto/platform-sdk`.

## Scripts

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run build --workspace=@prosto/platform-core` | Build the ESM package and type declarations. |
| `npm run typecheck --workspace=@prosto/platform-core` | Type-check the package. |
| `npm run test --workspace=@prosto/platform-core` | Run the test suite once. |
