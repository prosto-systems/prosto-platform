# Prosto Platform

Prosto Platform is a TypeScript monorepo for a headless, micro-core platform
extended by independently built modules. The SDK is the contract authority;
the core, adapters, CLI, contract-test package, and administration shell build
on those contracts.

## Current status

The repository contains the platform foundations and an alpha administration
module runtime. It does not yet provide a production HTTP backend, production
module discovery, module asset serving, artifact-integrity verification, or
Content Security Policy configuration. See the
[`@prosto/platform-admin-shell` README](packages/platform-admin-shell/README.md)
for the implemented admin contract and its limits.

## Workspace layout

| Path | Purpose |
| --- | --- |
| `packages/platform-sdk` | Public contracts, validation schemas, and admin runtime types. |
| `packages/platform-core` | Minimal runtime kernel, configuration, module loading, events, logging, caching, and services. |
| `packages/platform-contract-tests` | Reusable contract-conformance package for modules. |
| `packages/platform-cli` | CLI scaffolding and validation package. |
| `packages/platform-adapters/platform-adapter-typeorm` | TypeORM persistence adapter. |
| `packages/platform-utils/platform-admin-vite` | Vite transform for the shared admin Vue runtime. |
| `packages/platform-admin-shell` | Vue, Vuetify, Pinia, and Vue I18n administration shell. |
| `examples/module-test` | Example platform module and admin-plugin artifact. |

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

The example in `examples/module-test` demonstrates a module package, an admin
plugin, localized messages, workspaces, menu entries, and blades.
