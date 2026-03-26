# Phase 07 - Internal MVP Validation and Operability Readiness

## Phase Objective
Validate the platform in production-like staging with internal modules, prove KPI and SLO readiness, and close pre-MVP risks before ecosystem expansion.

## Scope Boundaries
### In Scope
- Staging pilot execution with internal modules.
- KPI and SLO measurement against acceptance thresholds.
- Incident and exception capture with corrective action loop.
- Go or no-go decision package for next phase.

### Out of Scope
- Full external module onboarding at scale.
- Public release marketing and partner rollout.
- Long-term multi-team support model changes.

## Prerequisites and Dependencies
- Phases 01 through 06 completed and passing on protected branches.
- Metric and gate definitions from `.context/03-work-plan/02-metrics-acceptance-and-risk-controls.md`.
- Pre-MVP objective and acceptance references from `.context/03-work-plan/pre-mvp-audit-and-execution-plan.md`.

## Detailed Ordered Implementation Steps
1. Define internal pilot module set and lock tested versions.
2. Run repeated staging deployments in both `strict` and `best-effort` startup modes.
3. Collect KPI set:
   - strict startup success rate
   - startup duration p95 drift
   - diagnostics completeness
   - contract violation rate
4. Capture all incidents and policy exceptions with owner and due action.
5. Run root-cause analysis for each severity-high issue and patch controls.
6. Re-run pilot cycles until stability trend is acceptable across consecutive runs.
7. Produce pre-MVP gate report with explicit go or no-go decision.

## Code Examples
### Example: KPI report record
```yaml
pilot_window: 2026-q2-internal-mvp
kpi:
  strict_startup_success_rate: 99.7
  startup_p95_drift_percent: 11
  diagnostics_completeness_percent: 100
  contract_violation_rate_per_100_runs: 1.5
decision: go
```

### Example: exception register entry
```yaml
id: EX-014
scope: performance-gate-temporary-threshold
owner: core-runtime
reason: benchmark-environment-noise
expires_at: 2026-06-30
status: approved-with-mitigation
```

## Affected Modules or Files
### Existing files likely updated
- `.context/03-work-plan/02-metrics-acceptance-and-risk-controls.md`
- `.context/03-work-plan/pre-mvp-audit-and-execution-plan.md`

### New files expected
- `docs/operations/internal-mvp-gate-report.md`
- `docs/operations/incident-register.md`
- `docs/operations/policy-exception-register.md`

## Validation and Testing Approach
- Repeatability checks across consecutive staging cycles.
- Statistical validation of KPI trend, not single-run snapshots.
- Verification that all exceptions have TTL and mitigation plan.
- Formal gate review with architecture, security, and runtime owners.

## Data or Migration Impact
- No schema migration requirement.
- Operational data accumulation for diagnostics and reliability trend baselines.

## Risks and Mitigations
- Risk: staged environment does not represent production behavior.
  - Mitigation: production-like config parity checks and controlled load profile.
- Risk: KPI pass hides unresolved medium-severity drift.
  - Mitigation: require issue trend review even for go decision.

## Rollback Approach
- If gate fails, stay on hardening cycle and block ecosystem expansion.
- Roll back to previous known-good module set for staging baseline.
- Reopen unresolved risks in active backlog with explicit owners.

## Completion Criteria
- Internal MVP gate criteria are met or formal exception is approved.
- Reliability and diagnostics trend is stable over consecutive pilot cycles.
- Incident and exception registers are complete and auditable.
- Formal go or no-go decision is documented with evidence links.
