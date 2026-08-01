# Security Risk-to-Control Matrix

## Overview

This document maps the high and critical security risks from
[`.context/02-architecture-design/06-risk-management.md`](../../.context/02-architecture-design/06-risk-management.md)
to the runtime controls, automated tests, and CI gates that mitigate them.
It is the authoritative evidence store for security-control coverage in
prosto-platform and is updated whenever a control, test, or gate changes.

## Risk-to-Control Mapping

| Risk ID | Risk | Control | Code | Tests | CI Gate |
|---------|------|---------|------|-------|---------|
| R-SEC-01 | Loading an unauthorized or unexpected module in production | Module allowlist policy (production profile) | [`packages/platform-core/src/modularity/policy/allowlist-policy/allowlist-policy-evaluator.ts`](../../packages/platform-core/src/modularity/policy/allowlist-policy/allowlist-policy-evaluator.ts:1) | [`packages/platform-core/tests/unit/modularity/policy/allowlist.policy.test.ts`](../../packages/platform-core/tests/unit/modularity/policy/allowlist.policy.test.ts:1) | `runtime-policy` job in [`.github/workflows/policy-gates.yml`](../../.github/workflows/policy-gates.yml:1) |
| R-SEC-02 | Tampered or replaced module artifact (checksum/signature mismatch) | Integrity verification in source loaders + integrity verifier | [`packages/platform-core/src/security/verifiers/integrity.verifier.ts`](../../packages/platform-core/src/security/verifiers/integrity.verifier.ts:1), [`packages/platform-core/src/modularity/loader/sources/path.source.ts`](../../packages/platform-core/src/modularity/loader/sources/path.source.ts:1), [`packages/platform-core/src/modularity/loader/sources/url.source.ts`](../../packages/platform-core/src/modularity/loader/sources/url.source.ts:1), [`packages/platform-core/src/modularity/loader/sources/registry.source.ts`](../../packages/platform-core/src/modularity/loader/sources/registry.source.ts:1) | [`packages/platform-core/tests/unit/security/integrity.verifier.test.ts`](../../packages/platform-core/tests/unit/security/integrity.verifier.test.ts:1) | `runtime-policy` job |
| R-SEC-03 | Secrets leaked into logs, diagnostics, or configuration validators | Secret redaction in logger, diagnostics, and configuration validator | [`packages/platform-core/src/security/redactors/secrets.redactor.ts`](../../packages/platform-core/src/security/redactors/secrets.redactor.ts:1), [`packages/platform-core/src/logging/module-logger/console/console-module-logger.ts`](../../packages/platform-core/src/logging/module-logger/console/console-module-logger.ts:1), [`packages/platform-core/src/diagnostics/builders/report.base-builder.ts`](../../packages/platform-core/src/diagnostics/builders/report.base-builder.ts:1), [`packages/platform-core/src/common/configuration/configuration.validator.ts`](../../packages/platform-core/src/common/configuration/configuration.validator.ts:1) | [`packages/platform-core/tests/unit/security/secrets-redactor.test.ts`](../../packages/platform-core/tests/unit/security/secrets-redactor.test.ts:1) | `runtime-policy` job |
| R-SEC-04 | Module reads/writes config sections outside its capability grant | Per-class config access policy | [`packages/platform-core/src/modularity/policy/config-access-policy/config-access-policy-evaluator.ts`](../../packages/platform-core/src/modularity/policy/config-access-policy/config-access-policy-evaluator.ts:1), [`packages/platform-core/src/modularity/policy/config-access-policy/strategies/config-access-policy.strategy.ts`](../../packages/platform-core/src/modularity/policy/config-access-policy/strategies/config-access-policy.strategy.ts:1) | integration tests under [`packages/platform-core/tests/`](../../packages/platform-core/tests/) and [`packages/platform-contract-tests/`](../../packages/platform-contract-tests/) | `runtime-policy` job |
| R-SEC-05 | Non-deterministic lifecycle / supply chain timing anomalies that could mask malicious initialization | Deterministic lifecycle test gate | bootstrap stages in [`packages/platform-core/src/bootstrap/stages/`](../../packages/platform-core/src/bootstrap/stages/) | `test:lifecycle-determinism` script | `FF-03 lifecycle determinism` step in [`.github/workflows/quality-gates.yml`](../../.github/workflows/quality-gates.yml:34) |

## CI Gate Reference

All security risks above are blocked from merging on `main` / `develop` by the
[`runtime-policy`](../../.github/workflows/policy-gates.yml:37) job, which runs
`npm run validate:runtime-policy` after a full `npm run build`.

To extend coverage with the performance regression gate (Phase 06 — completed),
see [`../performance/risk-control-matrix.md`](../performance/risk-control-matrix.md)
and the `bench-regression` job in
[`.github/workflows/quality-gates.yml`](../../.github/workflows/quality-gates.yml).

## Updating This Matrix

When a new control is added, a new test is introduced, or a CI gate changes:

1. Add or update the corresponding row in the mapping table.
2. Verify the linked paths still exist (the table is verified by code review
   on every PR that touches security infrastructure).
3. Reference this matrix from the change PR description so reviewers can
   confirm coverage deltas.
4. If a new risk class is introduced, add the risk ID in the upstream
   [`06-risk-management.md`](../../.context/02-architecture-design/06-risk-management.md)
   document first, then mirror it here.

## Related Documents

- [`module-loading-policy.md`](module-loading-policy.md) — runtime policy
- [`../performance/risk-control-matrix.md`](../performance/risk-control-matrix.md) — performance risks
- [`../../.context/02-architecture-design/06-risk-management.md`](../../.context/02-architecture-design/06-risk-management.md) — risk register source of truth
- [ADR-0003: Module Loading Security](../../.context/02-architecture-design/adr/ADR-0003-module-loading-security-allowlist-integrity.md)
