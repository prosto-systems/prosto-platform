## Summary
- Describe what changed and why.

## Related Context
- Architecture baseline: `.context/02-architecture-design/01-architecture-baseline.md`
- Branching strategy: `.context/02-architecture-design/05-git-branching-strategy.md`
- Risk controls: `.context/03-work-plan/02-metrics-acceptance-and-risk-controls.md`

## Evidence Links (Required for protected branches)
- FF-01 kernel boundary guard: <!-- CI run link -->
- FF-02 dependency policy guard: <!-- CI run link -->
- FF-04 runtime-policy: <!-- CI run link -->
- FF-03 lifecycle determinism: <!-- CI run link -->
- FF-05 contracts gate: <!-- CI run link -->
- Release evidence artifact (`release-evidence.json`): <!-- artifact/run link -->

## Architecture and Boundary Checklist
- [ ] Changes preserve micro-core boundaries (no adapter/module logic in core).
- [ ] No forbidden cross-package imports introduced.
- [ ] Contract-first approach is respected (types/contracts before runtime coupling).
- [ ] Any architecture-impacting change references relevant ADR/design doc.

## Risk-Control Checklist
- [ ] I reviewed R-01..R-06 controls in `.context/03-work-plan/02-metrics-acceptance-and-risk-controls.md`.
- [ ] If any gate is bypassed, an exception record with owner, reason, scope, and expiry is attached.
- [ ] Security-sensitive changes include validation and redaction considerations.
- [ ] Potential rollout/rollback impact is documented.

## Exception Record (Fill only if needed)
```json
{
  "id": "EX-YYYYMMDD-001",
  "scope": ["FF-0X", "branch:develop"],
  "owner": "<name>",
  "reason": "<justification>",
  "createdAt": "<ISO-8601>",
  "expiresAt": "<ISO-8601>",
  "mitigation": "<short-term control>",
  "postmortemAction": "<follow-up action>"
}
```

## Validation Notes
- [ ] I confirmed scripts introduced in this PR are present in `package.json`.
- [ ] I confirmed required workflows exist under `.github/workflows/`.
