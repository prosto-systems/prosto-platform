# Work Plan Index

This directory contains the actionable deep-audit outcome for `prosto-platform` under a mixed strategy:
internal MVP first, then external ecosystem scale-out.

## Status Note (2026-06-04)
- Phase 01 through Phase 07 are completed in repository reality.
- Current active implementation phase is Phase 08 (admin BFF adapter and discovery pipeline).
- This directory primarily captures audit and planning guidance produced before runtime hardening phases.
- For live phase status, use `.context/04-implementation-plan/README.md` and the root `README.md`.

## Execution Order

1. [Assumptions and audit findings](./00-assumptions-and-audit-findings.md)
2. [Recommendations by horizon](./01-recommendations-by-horizon.md)
3. [Metrics acceptance and risk controls](./02-metrics-acceptance-and-risk-controls.md)
4. [Implementation sequence](./03-implementation-sequence.md)
5. [Pre-MVP audit and execution plan](./pre-mvp-audit-and-execution-plan.md)

## How to Use

- Start from assumptions and verified findings.
- Use recommendations file as the prioritized backlog.
- Use metrics and acceptance file as release and quality gates.
- Execute strictly by sequence file to minimize rework.
- Use pre-MVP plan file as the operational checklist for immediate delivery.

## Planning Principles Applied

- Contract-first and boundary-first execution.
- Impact over effort prioritization.
- Security and compatibility controls before ecosystem expansion.

[//]: # (- Observable and testable runtime behavior as non-negotiable.)
