# Phase 03 - SDK Contract Baseline and Manifest Validation

## Phase Objective
Implement `@prosto/platform-sdk` as the single contract authority for modules, manifests, lifecycle interfaces, service tokens, and validation primitives.

## Scope Boundaries
### In Scope
- Define core public types and interfaces for module lifecycle.
- Define manifest schema and compatibility metadata model.
- Define service and event token strategy.
- Add stability-level annotations for exported API surfaces.

### Out of Scope
- Runtime loader implementation.
- Full observability pipeline implementation.
- External module template repository.

## Prerequisites and Dependencies
- Phase 02 workspace and package skeleton complete.
- ADR and domain model references:
  - `.context/02-architecture-design/adr/ADR-0001-micro-core-kernel-boundary.md`
  - `.context/02-architecture-design/02-domain-and-capability-model.md`
  - `.context/02-architecture-design/adr/ADR-0002-sdk-contract-and-semver-governance.md`

## Detailed Ordered Implementation Steps
1. Implement manifest types in `platform-sdk/src/types`:
   - module identity
   - version ranges
   - security class
   - criticality
   - capabilities
2. Implement lifecycle and context interfaces in `platform-sdk/src/interfaces`:
   - `PlatformModule`
   - `ModuleContext`
   - `ServiceRegistry`
   - `EventBus`
3. Implement tokens model in `platform-sdk/src/tokens` with typed token helper.
4. Implement manifest schema and semantic validation helpers in `platform-sdk/src/validation`.
5. Define explicit error model for validation and compatibility failures.
6. Add package-level API report and stability labels for each exported symbol.
7. Add unit tests for:
   - schema validation pass/fail cases
   - semver compatibility validation
   - token uniqueness and typing behavior

## Code Examples
### Example: module contract interface
```typescript
export interface PlatformModule {
  manifest: PlatformModuleManifest;
  register(ctx: ModuleContext): Promise<void> | void;
  init(ctx: ModuleContext): Promise<void> | void;
  start(ctx: ModuleContext): Promise<void> | void;
  stop(ctx: ModuleContext): Promise<void> | void;
}
```

### Example: manifest schema contract
```typescript
export const PlatformModuleManifestSchema = z.object({
  id: z.string().min(3),
  version: z.string(),
  platformVersion: z.string(),
  criticality: z.enum(['normal', 'critical']),
  securityClass: z.enum(['trusted', 'internal', 'third-party-reviewed']),
  capabilities: z.array(z.string()).min(1)
});
```

### Example: typed service token
```typescript
export type ServiceToken<T> = symbol & { readonly __type?: T };

export const SERVICE_TOKEN_NAME_PREFIX = '__PPS_' // Prosto Platform Service

export function createServiceToken<T>(name: string): ServiceToken<T> {
  return Symbol.for(SERVICE_TOKEN_NAME_PREFIX + name) as ServiceToken<T>;
}
```

## Affected Modules or Files
### Existing files likely updated
- `packages/platform-sdk/package.json`
- `packages/platform-sdk/src/index.ts`

### New files expected
- `packages/platform-sdk/src/types/*.ts`
- `packages/platform-sdk/src/interfaces/*.ts`
- `packages/platform-sdk/src/tokens/*.ts`
- `packages/platform-sdk/src/validation/*.ts`
- `packages/platform-sdk/src/errors/*.ts`
- `packages/platform-sdk/test/*.test.ts`

## Validation and Testing Approach
- Unit tests for schema, types, and semver rules.
- Type-level tests for token and interface contracts.
- Public API snapshot to detect accidental breaking changes.
- CI gate requiring full pass before downstream package integration.

## Data or Migration Impact
- No runtime data migration.
- Contract migration impact appears when modules adopt SDK version; include migration notes for breaking changes.

## Risks and Mitigations
- Risk: over-expanding SDK with runtime implementation concerns.
  - Mitigation: enforce contract-only boundary and API review gate.
- Risk: unstable contracts early on causing downstream churn.
  - Mitigation: stability labels and semver governance policy from day one.

## Rollback Approach
- If newly introduced contract proves incorrect, rollback via minor/patch deprecation when possible.
- For critical contract mistakes, ship explicit migration helper and compatibility adapter in next release line.

## Completion Criteria
- SDK exports lifecycle, manifest, token, and error contracts required by architecture docs.
- Manifest schema validates mandatory governance fields.
- Stability labels exist for all public exports.
- Unit and type-level tests pass with CI evidence.
