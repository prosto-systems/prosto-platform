# Package Dependency Map (Phase 02)

## Purpose
This document captures the enforceable package dependency boundaries introduced in Phase 02.

## Status
- Phase 02 baseline is completed and active in repository validation scripts.

## Sources
- `.context/04-implementation-plan/02-phase.md`
- `.context/02-architecture-design/04-package-structure-blueprint.md`
- `.context/02-architecture-design/adr/ADR-0001-micro-core-kernel-boundary.md`
- `.context/02-architecture-design/adr/ADR-0002-sdk-contract-and-semver-governance.md`

## Workspace Packages
- `@prosto/platform-sdk`
- `@prosto/platform-core`
- `@prosto/platform-contract-tests`
- `@prosto/platform-cli`
- `@prosto/platform-adapter-http`

## Allowed Internal Dependencies (Phase 02)
- `@prosto/platform-sdk`: none
- `@prosto/platform-core`: `@prosto/platform-sdk`
- `@prosto/platform-contract-tests`: `@prosto/platform-sdk`
- `@prosto/platform-cli`: `@prosto/platform-sdk`
- `@prosto/platform-adapter-http`: `@prosto/platform-sdk`

## Ownership Notes
- HTTP/security middleware dependencies are owned by `@prosto/platform-adapter-http`.
- Root `package.json` is orchestration-only for workspace scripts and governance checks.

## Enforcement Scripts
- `npm run lint:architecture`
- `npm run validate:dependency-policy`
- `npm run validate:module-graph`
- `npm run validate:public-api-boundary`

Current scripts enforce topology and baseline dependency constraints. More granular checks are planned in later phases.
