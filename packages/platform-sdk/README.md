# @prosto/platform-sdk

Contract authority for module manifests, lifecycle interfaces, typed tokens, and validation primitives.

## Phase Status
- Phase 03: completed
- Stability baseline: contract-first (`@stable` tags on all public exports)

## Public Surface
- Manifest contracts and compatibility metadata:
  - `PlatformModuleManifest`
  - `ModuleDependency`
  - `ModuleCompatibility`
  - Compatibility fields: required `sdkVersion`, optional `nodeVersion`
- Lifecycle and runtime interfaces:
  - `PlatformModule`
  - `ModuleContext`
  - `ServiceRegistry`
  - `EventBus`
- Typed token strategy:
  - `createServiceToken`
  - `createEventToken`
  - `ServiceToken`
  - `EventToken`
- Validation primitives:
  - `PlatformModuleManifestSchema`
  - `safeValidatePlatformModuleManifest`
  - `parsePlatformModuleManifest`
  - `validateManifestCompatibility`
  - `assertManifestCompatibility`
- Error model:
  - `PlatformSdkError`
  - `ManifestValidationError`
  - `CompatibilityValidationError`

## Commands
- `npm run --workspace @prosto/platform-sdk build`
- `npm run --workspace @prosto/platform-sdk typecheck`
- `npm run --workspace @prosto/platform-sdk test` (Vitest unit tests + type-level contract checks)

## Notes
- SDK remains contract-only and does not include runtime module loading logic.
- Dependency footprint is intentionally minimal (`zod`, `semver`) to support validation primitives.
