# @prosto/platform-core

`@prosto/platform-core` is the alpha runtime kernel for Prosto Platform. It
discovers module artifacts, validates manifests, resolves dependency order,
runs module lifecycles, coordinates optional persistence initialization, and
collects startup and shutdown diagnostics.

The core depends on SDK contracts and does not depend on adapters or feature
modules. Compose an adapter, such as the TypeORM persistence adapter, in the
application's `RuntimeBuilder` options.

## Requirements

- Node.js >= 22.23.0
- npm >= 10

## Usage

Build a runtime with module artifact source descriptors, then start and stop it
at the application boundary. The core supports `memory`, `path`, `registry`,
and `url` module sources.

```ts
import { RuntimeBuilder } from '@prosto/platform-core';
import type {
  IPlatformModule,
  IPlatformModuleContext,
  IPlatformModuleManifest,
} from '@prosto/platform-sdk';

const manifest: IPlatformModuleManifest = {
  id: 'example-module',
  version: '1.0.0',
  sdkVersion: '^0.0.0',
  title: 'Example module',
  dependencies: [],
};

class ExampleModule implements IPlatformModule {
  init(_context: IPlatformModuleContext): void {}
  start(_context: IPlatformModuleContext): void {}
  stop(_context: IPlatformModuleContext): void {}
}

const runtime = new RuntimeBuilder().build({
  configDir: './config',
  modules: [{ type: 'memory', manifest, module: new ExampleModule() }],
});

await runtime.start();
console.log(runtime.reports.startup);
await runtime.stop();
```

The builder reads package defaults, then optional deployment files from
`configDir` (`app_settings.json`, environment-specific settings, and
`app_settings.local.json`). Environment variables with the `PROSTO_` prefix
and command-line arguments override file settings.

## Module artifact sources

Pass sources through `RuntimeBuilder`'s `modules` option:

- `memory` requires `module` and `manifest`; use it for in-process modules and
  tests.
- `path` requires a local artifact `path`.
- `url` requires an HTTPS `url`; insecure remote URLs are rejected before
  loading.
- `registry` requires `packageName` and `version`; it optionally accepts
  `registryUrl`, `authToken`, and `authType` (`bearer` or `basic`).

Path, URL, and registry sources accept an optional `integrity.checksum`.
Supplied checksums are verified, and registry artifacts use the registry's
integrity metadata when no checksum is supplied. The declared
`integrity.signature` field is not verified by the current loader.

For a persistence-enabled composition, see
[`examples/typeorm-shared-datasource`](../../examples/typeorm-shared-datasource).

## Runtime behavior

- The bootstrap pipeline discovers artifacts, validates module manifests,
  resolves dependencies, initializes modules, initializes persistence, and
  starts modules.
- The configured startup policy controls whether a module failure stops the
  runtime or is recorded while unaffected modules continue.
- `runtime.reports` exposes structured startup, shutdown, and operational
  diagnostics. Configured secret redaction is applied to diagnostic output.
- Call `stop()` during application shutdown to stop started modules in reverse
  lifecycle order and dispose core services.

Public core APIs are `@alpha` and may change in minor releases. Public module
and adapter contracts belong to `@prosto/platform-sdk`.

## Scripts

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run build --workspace=@prosto/platform-core` | Build the ESM package and type declarations. |
| `npm run start --workspace=@prosto/platform-core` | Run the development runtime demonstration. |
| `npm run typecheck --workspace=@prosto/platform-core` | Type-check the package. |
| `npm run test --workspace=@prosto/platform-core` | Run the test suite once. |
