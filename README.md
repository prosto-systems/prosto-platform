# Prosto Platform

Prosto Platform is a TypeScript monorepo for a headless, micro-core platform
extended by independently built modules. The SDK is the contract authority;
the core, adapters, CLI, contract-test package, and administration shell build
on those contracts.

## Current status

The repository contains an alpha runtime kernel, TypeORM and Fastify adapters,
and an alpha administration module runtime. The runtime discovers local module
packages, validates their manifests and SDK/Node.js compatibility, resolves
their dependencies, copies their builds into a probing directory, executes
their lifecycle, and exposes startup and shutdown diagnostics. It does not yet
provide remote module acquisition, a production admin HTTP application, admin
module asset serving, or Content Security Policy configuration. The Fastify HTTP
application is available for infrastructure probes and module endpoints; it does
not implement admin, authentication, or static-asset APIs. See the
[`@prosto/platform-admin-shell` README](packages/platform-admin-shell/README.md)
for the implemented admin contract and its limits.

## Workspace layout

| Path | Purpose |
| --- | --- |
| `packages/platform-sdk` | [Public contracts, validation schemas, and admin runtime types.](packages/platform-sdk/README.md) |
| `packages/platform-core` | [Runtime kernel, module loading, lifecycle orchestration, diagnostics, events, and services.](packages/platform-core/README.md) |
| `packages/platform-admin-shell` | [Vue, Vuetify, Pinia, and Vue I18n administration shell.](packages/platform-admin-shell/README.md) |
| `packages/platform-adapters/platform-adapter-typeorm` | [TypeORM persistence adapter.](packages/platform-adapters/platform-adapter-typeorm/README.md) |
| `packages/platform-adapters/platform-adapter-fastify` | [Framework-neutral platform HTTP application backed by Fastify.](packages/platform-adapters/platform-adapter-fastify/README.md) |
| `packages/platform-utils/platform-admin-vite` | [Vite transform for the shared admin Vue runtime.](packages/platform-utils/platform-admin-vite/README.md) |
| `packages/platform-utils/platform-cli` | [CLI package scaffold.](packages/platform-utils/platform-cli/README.md) |
| `packages/platform-utils/platform-contract-tests` | [Reusable module contract-conformance package.](packages/platform-utils/platform-contract-tests/README.md) |
| `packages/platform-utils/tsconfig` | [Private shared strict TypeScript configuration.](packages/platform-utils/tsconfig/README.md) |
| `examples/module-test` | [Example platform module and admin-plugin artifact.](examples/module-test/README.md) |
| `examples/typeorm-shared-datasource` | [Runtime composition with a shared TypeORM DataSource.](examples/typeorm-shared-datasource/README.md) |

## Requirements

- Node.js >= 22.23.0
- npm >= 10 (the repository uses npm 12.0.2)

Install dependencies from the repository root:

```bash
npm install
```

## Commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run build` | Build workspaces through Turborepo in dependency order. |
| `npm run dev` | Start available workspace development tasks. |
| `npm run typecheck` | Type-check workspaces. |
| `npm run test` | Run workspace test suites. |
| `npm run test:contracts` | Run workspaces that expose contract tests. |
| `npm run lint` | Run ESLint. |
| `npm run lint:fix` | Run ESLint with fixes. |
| `npm run format` | Check formatting with Prettier. |
| `npm run format:fix` | Format files with Prettier. |

To run a package script directly, use npm workspaces. For example:

```bash
npm run test --workspace=@prosto/platform-admin-shell
npm run build --workspace=@examples/module-test
```

## Architecture boundaries

- Define and evolve public contracts in `@prosto/platform-sdk` before their
  implementations.
- `platform-core` must not depend on adapters, feature modules, or frontend
  runtimes.
- HTTP contracts belong to the SDK; Fastify application lifecycle and transport
  mapping belong to `platform-adapter-fastify`, never to `platform-core`.
- Adapters and feature modules depend on SDK contracts, not on core internals
  or one another.
- Admin modules integrate with the separate admin shell through SDK contracts;
  they do not access configured shell service instances directly.
- Admin-plugin artifacts are trusted first-party code, not a security sandbox.

The repository's source code and package manifests are the authority for the
currently implemented behavior. Architectural rules describe the boundaries to
preserve as the platform evolves.

## Administration modules

The admin shell loads ordered plugin entries returned by its platform manifest.
An entry is a native ESM artifact that exports exactly one
`registerAdminPlugin` callback. The callback receives services for permission
checks, translations, workspaces, menu items, blades, and blade toolbar
commands. Build admin artifacts with `@prosto/platform-admin-vite` so Vue,
Vue I18n, Pinia, Vue Router, and Vuetify are consumed from the shell's shared
runtime rather than bundled again.

[`examples/module-test`](examples/module-test/README.md) demonstrates a module
package, contract checks, artifact packaging, an admin plugin, localized
messages, workspaces, menu entries, and blades.

## Platform modules

The core discovers every `manifest.json` below the configured
`platform.discoveryPath` (except files below `artifacts/`). Each manifest must
belong to a local module package containing `package.json` and a built `dist/`
directory. After manifest and compatibility validation, the runtime resolves
dependency order, refreshes the probing directory when required, loads the
platform ESM entry, and runs `init()`, persistence initialization, and
`start()`.

The preferred package export is `./platform`. See the
[`@prosto/platform-core` README](packages/platform-core/README.md) for the
artifact layout, configuration options, probing refresh behavior, and complete
bootstrap order.

## HTTP applications

Applications compose `FastifyHttpApplication` with a `RuntimeBuilder` factory.
Modules declare SDK `IHttpEndpoint` values through `context.http.endpoints` in
`init()` only; the adapter exposes endpoints only after their owners start.
`GET /health` and `GET /ready` are public infrastructure probes, not the admin
shell's `/api/admin/platform/health`. See the
[`@prosto/platform-adapter-fastify` README](packages/platform-adapters/platform-adapter-fastify/README.md)
and the [TypeORM example](examples/typeorm-shared-datasource/README.md).
