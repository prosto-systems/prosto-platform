# Phase 06 - Security Controls and Performance Regression Gates

## Phase Objective
Harden runtime and delivery pipeline with enforceable module loading security controls and measurable performance regression gates aligned with risk register priorities.

## Scope Boundaries
### In Scope
- Allowlist enforcement in runtime and CI.
- Artifact integrity verification workflow.
- Secret redaction checks for logs and diagnostics.
- Startup and event-dispatch benchmark baseline with regression budgets.

### Out of Scope
- Full external maintainer onboarding program.
- Multi-region deployment and infra-level hardening.
- Advanced threat modeling outside module supply chain and runtime policy scope.

## Prerequisites and Dependencies
- Phase 05 runtime foundation complete.
- Security architecture and risk references:
  - `.context/02-architecture-design/adr/ADR-0003-module-loading-security-allowlist-integrity.md`
  - `.context/02-architecture-design/06-risk-management.md`
  - `.context/03-work-plan/02-metrics-acceptance-and-risk-controls.md`

## Detailed Ordered Implementation Steps
1. Implement module allowlist policy model and enforcement points:
   - CI pre-merge policy check
   - runtime startup policy check
2. Implement artifact integrity verification:
   - checksum baseline first
   - signature verification extension path
3. Introduce security metadata validation for required manifest fields.
4. Add secret redaction library integration and test fixtures for sensitive payloads.
5. Build benchmark suite for:
   - startup duration with reference module set
   - event dispatch throughput and latency
6. Define regression budget policy and failing thresholds for protected branches.
7. Publish risk-to-control mapping to prove mitigation coverage for high and critical risks.

## Code Examples
### Example: allowlist policy contract
```yaml
module_loading_policy:
  require_allowlist: true
  require_integrity: true
  blocked_security_classes:
    - unreviewed-third-party
```

### Example: runtime integrity check flow
```typescript
const isAllowed = allowlist.contains(moduleArtifact.id, moduleArtifact.version);
if (!isAllowed) {
  throw new SecurityPolicyError('ALLOWLIST_VIOLATION');
}

const integrityOk = await verifyArtifactIntegrity(moduleArtifact);
if (!integrityOk) {
  throw new SecurityPolicyError('INTEGRITY_CHECK_FAILED');
}
```

### Example: performance gate thresholds
```yaml
performance_gates:
  startup_p95_drift_percent: 15
  startup_alert_percent: 20
  event_dispatch_p95_drift_percent: 15
```

## Affected Modules or Files
### Existing files likely updated
- `packages/platform-core/src/policy/*`
- `.github/workflows/policy-gates.yml`
- `.github/workflows/quality-gates.yml`

### New files expected
- `packages/platform-core/src/security/allowlist.policy.ts`
- `packages/platform-core/src/security/integrity.verifier.ts`
- `packages/platform-core/test/security/*.test.ts`
- `packages/platform-core/bench/startup.bench.ts`
- `packages/platform-core/bench/events.bench.ts`
- `docs/security/module-loading-policy.md`
- `docs/performance/regression-budgets.md`

## Validation and Testing Approach
- Negative and positive security policy tests for allowlist and integrity outcomes.
- Redaction tests asserting zero secret leakage in structured logs.
- Benchmark trend checks against baseline snapshots.
- CI policy gate simulation with intentionally failing artifacts.

## Data or Migration Impact
- No business data migration.
- Security operations migration from manual module trust decisions to policy-enforced workflow.

## Risks and Mitigations
- Risk: strict controls block legitimate internal development workflows.
  - Mitigation: environment-specific policy profile with controlled non-production flexibility.
- Risk: benchmark flakiness produces false failures.
  - Mitigation: warmup rounds, median-of-runs strategy, and baseline drift windows.

## Rollback Approach
- Roll back policy strictness by environment tier if production incident requires temporary relief.
- Revert failing benchmark threshold changes while preserving collected baseline evidence.
- Keep emergency override documented with owner, reason, and expiry.

## Completion Criteria
- Production-target startup rejects non-allowlisted or integrity-invalid modules.
- Secret redaction checks pass with zero leakage in required outputs.
- Performance budget gates run in CI and enforce agreed thresholds.
- Risk register high and critical controls have explicit implementation evidence.
