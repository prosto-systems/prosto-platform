# Phase 09 - Admin Shell Integration and Plugin Runtime

## Phase Objective
Deliver integration of separate `admin-shell` runtime with platform contracts and admin BFF so UI plugins can be discovered, validated, and rendered through policy-gated extension points.

## Scope Boundaries
### In Scope
- Separate `admin-shell` repository setup and integration contracts.
- Plugin runtime registry in shell for navigation, pages, widgets, and actions.
- Shell-side compatibility handling and degraded rendering behavior.
- Contract-driven plugin loading lifecycle and error surfacing.
- End-to-end integration with `platform-adapter-admin-bff` discovery API.

### Out of Scope
- Embedding shell runtime inside `platform-core` process.
- Full design-system maturity and non-functional UI refinements.
- Third-party ecosystem scale onboarding.

## Prerequisites and Dependencies
- Phase 07 admin contracts package completed.
- Phase 08 admin BFF adapter completed.
- Security and policy controls from Phase 06 enforced.
- ADR references:
  - `.context/02-architecture-design/adr/ADR-0001-micro-core-kernel-boundary.md`
  - `.context/02-architecture-design/adr/ADR-0009-admin-ui-hybrid-shell-plugin-model.md`

## Detailed Ordered Implementation Steps
1. Create separate `admin-shell` repository with workspace conventions aligned to platform contracts.
2. Implement shell contract client for discovery payload retrieval from admin BFF.
3. Implement shell plugin registry:
   - register extension points by manifest type
   - resolve plugin order and conflict policy
   - isolate plugin failures from shell bootstrap
4. Implement shell compatibility gate:
   - compare plugin manifest compatibility range
   - mark incompatible plugins as unavailable with diagnostics
5. Implement permission-aware rendering guards based on discovery payload policy metadata.
6. Implement degraded mode behavior:
   - render shell when optional plugin fails
   - show operator-facing diagnostics panel for rejected plugins
7. Add integration contract tests using mock BFF and mixed plugin manifest fixtures.
8. Add telemetry instrumentation for plugin load outcomes and UI extension usage.

## Code Examples
### Example: plugin registry bootstrap
```typescript
const discovery = await adminBffClient.getDiscovery();

for (const plugin of discovery.plugins) {
  if (!isShellCompatible(plugin)) {
    diagnostics.addRejected(plugin.id, 'SHELL_VERSION_MISMATCH');
    continue;
  }

  pluginRegistry.register(plugin);
}
```

### Example: permission guard
```typescript
export function canRenderExtension(userPermissions: string[], required: string[]): boolean {
  return required.every(permission => userPermissions.includes(permission));
}
```

### Example: degraded shell behavior
```typescript
try {
  await pluginRuntime.load(pluginRef);
} catch {
  diagnostics.addRejected(pluginRef.id, 'PLUGIN_LOAD_FAILED');
  continue;
}
```

## Affected Modules or Files
### Existing files likely updated
- `docs/compatibility/compatibility-matrix.md`
- `.context/04-implementation-plan/README.md`

### New files expected
- `admin-shell/package.json`
- `admin-shell/src/bootstrap/*.ts`
- `admin-shell/src/plugins/*.ts`
- `admin-shell/src/compatibility/*.ts`
- `admin-shell/src/permissions/*.ts`
- `admin-shell/src/diagnostics/*.ts`
- `admin-shell/test/integration/*.test.ts`
- `docs/admin-shell/integration-guide.md`

## Validation and Testing Approach
- End-to-end integration tests with BFF discovery API fixtures.
- Compatibility tests for accepted and rejected plugin scenarios.
- Permission rendering tests for role matrix coverage.
- Resilience tests for partial plugin failure during shell startup.
- Telemetry checks for required plugin lifecycle metrics.

## Data or Migration Impact
- No business data migration.
- Operational migration: admin workflows move from static internal UI to modular plugin-based shell.

## Risks and Mitigations
- Risk: plugin rendering failures break whole operator workflow.
  - Mitigation: plugin isolation and degraded-mode fallback with diagnostics.
- Risk: shell drift from contracts package.
  - Mitigation: pinned contract versions with compatibility CI checks.

## Rollback Approach
- Roll back shell to previous compatible contracts package version.
- Disable non-critical plugins via allowlist while preserving shell core navigation.
- Preserve plugin rejection diagnostics for rapid remediation.

## Completion Criteria
- `admin-shell` repository integrates with admin BFF discovery payload.
- Plugin runtime supports contract-driven extension points with compatibility gating.
- Permission-aware rendering and degraded behavior are validated.
- End-to-end integration tests pass with diagnostics and telemetry evidence.
