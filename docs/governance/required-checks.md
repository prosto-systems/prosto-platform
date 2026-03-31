# Required Checks for Protected Branches

## Purpose
This document defines required checks for `main` and `develop`, including ownership and escalation paths for failures.

## Related Governance Policy
- [./01-governance-policy.md](./01-governance-policy.md)

## Protected Branches
- `main`
- `develop`

## Required Checks Matrix

| Check Name | Fitness Function / Control | Workflow | Implementation Status | Owner | Backup Owner | Escalation Path |
|---|---|---|---|---|---|---|
| `FF-01 kernel boundary guard` | FF-01 | `policy-gates` | Implemented | Architecture Owner | Platform Core Lead | 1) Architecture Owner 2) Platform Core Lead 3) Engineering Manager |
| `FF-02 dependency policy guard` | FF-02 | `policy-gates` | Implemented | Architecture Owner | Platform Core Lead | 1) Architecture Owner 2) Platform Core Lead 3) Engineering Manager |
| `FF-04 runtime-policy` | FF-04 | `policy-gates` | Placeholder (Phase 04+) | Core Runtime Owner | Observability Owner | 1) Core Runtime Owner 2) Observability Owner 3) Engineering Manager |
| `FF-03 lifecycle determinism` | FF-03 | `quality-gates` | Placeholder (Phase 04+) | Core Runtime Owner | QA Lead | 1) Core Runtime Owner 2) QA Lead 3) Engineering Manager |
| `FF-05 contracts gate` | FF-05 | `quality-gates` | Placeholder (Phase 04+) | QA and Core | SDK Owner | 1) QA and Core 2) SDK Owner 3) Engineering Manager |
| `release-readiness-evidence` | Release readiness control | `release-readiness` | Implemented | Release Manager | Platform Core Lead | 1) Release Manager 2) Platform Core Lead 3) Engineering Manager |

## Non-Bypassable Policy
- All checks above are required for merge to `main` and `develop`.
- Direct push to protected branches must remain disabled.
- Admin override is allowed only via documented exception workflow with expiration.
- Placeholder checks are still required branch checks while implementation is in progress.

## Evidence Expectations
Each required check must expose machine-readable or artifact evidence:
- `policy-gates` and `quality-gates` logs as CI evidence.
- `release-readiness` artifact `.temp/ci/release-evidence.json` uploaded in workflow.
- Placeholder checks must emit explicit, machine-readable TODO status in workflow logs until implemented.

## Escalation SLA
- Acknowledgement: within 4 business hours.
- Initial remediation plan: within 1 business day.
- If unresolved for 2 business days: escalate to Engineering Manager.

## Review Cadence
- Weekly review of failures and exception usage.
- Monthly review of check quality and false-positive rate.
