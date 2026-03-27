# Phase 05 - Core Runtime Foundation and Deterministic Lifecycle

## Phase Objective
Implement `@prosto/platform-core` minimal kernel with deterministic module lifecycle orchestration, compatibility validation, and startup policies `strict` and `best-effort`.

## Scope Boundaries
### In Scope
- Runtime bootstrap pipeline: discover -> validate -> resolve -> lifecycle.
- Dependency graph resolution and ordering.
- Policy-driven startup behavior.
- Startup diagnostics payload with explicit reasons for load outcomes.

### Out of Scope
- Production-grade adapter coverage across all transports.
- Ecosystem-wide external module onboarding.
- Advanced distributed runtime topology.

## Prerequisites and Dependencies
- Phase 03 SDK contract definitions complete.
- Phase 04 contract tests and reference modules complete.
- Lifecycle and policy baselines in:
  - `.context/02-architecture-design/01-architecture-baseline.md`
  - `.context/02-architecture-design/02-domain-and-capability-model.md`
  - `.context/02-architecture-design/adr/ADR-0004-lifecycle-orchestration-and-startup-policies.md`

## Detailed Ordered Implementation Steps
1. Implement bootstrap coordinator in `platform-core/src/bootstrap`.
2. Implement module discovery and manifest loading in `platform-core/src/loader`.
3. Implement compatibility checks against SDK and platform version ranges.
4. Implement dependency graph builder and topological sorting.
5. Implement lifecycle orchestrator:
   - `register`
   - `init`
   - `start`
   - `stop`
6. Implement startup policy handler:
   - fail-fast for strict mode
   - degrade-and-continue for best-effort on non-critical failures
7. Implement diagnostics reporter capturing:
   - loaded modules
   - skipped modules
   - failed modules with reason codes
8. Add integration tests for deterministic ordering and policy behavior.

## Code Examples
### Example: startup policy guard
```typescript
if (policy === 'strict' && failure.kind !== 'none') {
  throw new StartupPolicyError('STRICT_STARTUP_BLOCKED', failure);
}

if (policy === 'best-effort' && failure.moduleCriticality === 'normal') {
  diagnostics.recordSkipped(failure);
  continue;
}
```

### Example: deterministic lifecycle execution
```typescript
for (const moduleRef of orderedModules) {
  await moduleRef.instance.register(ctx);
  await moduleRef.instance.init(ctx);
  await moduleRef.instance.start(ctx);
}
```

### Example: diagnostics output shape
```json
{
  "policy": "best-effort",
  "loaded": ["module-health@0.1.0"],
  "skipped": [{ "id": "module-auth", "reason": "COMPATIBILITY_MISMATCH" }],
  "failed": []
}
```

## Affected Modules or Files
### Existing files likely updated
- `packages/platform-core/package.json`
- `packages/platform-core/src/index.ts`

### New files expected
- `packages/platform-core/src/bootstrap/*.ts`
- `packages/platform-core/src/loader/*.ts`
- `packages/platform-core/src/compatibility/*.ts`
- `packages/platform-core/src/graph/*.ts`
- `packages/platform-core/src/lifecycle/*.ts`
- `packages/platform-core/src/policy/*.ts`
- `packages/platform-core/src/diagnostics/*.ts`
- `packages/platform-core/test/integration/*.test.ts`

## Validation and Testing Approach
- Integration tests for strict and best-effort startup paths.
- Determinism tests ensuring stable order under same config.
- Contract alignment tests with SDK interfaces.
- Diagnostics schema validation tests.

## Data or Migration Impact
- No persistent business data migration.
- Runtime behavior migration for startup failure handling semantics.

## Risks and Mitigations
- Risk: non-deterministic lifecycle due to implicit async side effects.
  - Mitigation: enforce explicit phase sequencing and bounded async operations.
- Risk: compatibility false negatives block valid modules.
  - Mitigation: maintain compatibility test matrix and explicit semver policy tests.

## Rollback Approach
- Feature-flag new startup policy enforcement where possible.
- On critical regression, rollback core package to previous tagged baseline and re-run compatibility suite.
- Preserve failing diagnostics payload for root-cause analysis.

## Completion Criteria
- Core runtime can load and orchestrate reference modules end-to-end.
- Strict and best-effort behavior match documented policy.
- Startup diagnostics include required metadata and reason taxonomy.
- Integration tests pass on protected branches.
