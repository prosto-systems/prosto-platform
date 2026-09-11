# AI Agent Behavior Rules

## When to Ask Questions

- Architecture rules constrain future changes; current package READMEs and ADRs also document implemented behavior. Verify both against source and manifests.
- When answering questions about available commands, source of truth is root `package.json`; lint scripts plus `test:contracts` are available.
- For single-test execution, inspect the target workspace's Vitest scripts and configuration; there is no root-level single-test script.
- Existing `.agents/rules/*` contained mostly generic recommendations and can overstate current capabilities; verify against concrete repo files.

## First-Time Scan Instructions

When first opening/analyzing this project, create or improve `AGENTS.md` containing:

1. Build/lint/test commands (if `package.json` exists)
2. Recommendations on code style, including import, formatting, types, naming conventions, error handling, etc.
3. Project architecture and structure guidelines
4. Development workflow and best practices
5. Security and performance considerations

### Repository State Validation (CRITICAL)

**BEFORE making any recommendations, verify:**

- [ ] Target workspace `tsconfig.json` files exist, including nested adapter and utility workspaces
- [ ] `packages/` directory exists (monorepo structure)
- [ ] `packages/*/src` exists for implemented packages
- [ ] Check `.github/workflows/` before claiming CI/CD exists (currently absent)
- [ ] Test runner configured (Vitest)
- [ ] ESLint configured
- [ ] Prettier configured

The root workspace globs are `packages/*`, `packages/*/*`, and `examples/*`.
Markdown is ignored by `.prettierignore`; a successful root formatting check
does not establish documentation formatting correctness.

### Missing Artifacts

Missing files indicate a gap in that capability, not that the entire platform
is unimplemented. State exactly what is absent and do not claim unavailable
scripts or automation. Runtime, adapters, shell, lint, and tests already exist.

## Command and Capability Claim Policy

- Only list commands that are present in the current root `package.json` (or package-level `package.json` when monorepo exists).
- Do not claim `lint`, `test`, `single-test`, or CI commands unless scripts/configs exist in repository artifacts.
- For unavailable capabilities, state the gap.

## Rule Precedence and Conflict Resolution

When guidance conflicts, use this precedence order:

1. **Repository reality (source of truth)**: concrete files and scripts in repo
2. **`AGENTS.md`**: operational policy for all agents in this repository
3. **`.agents/rules/*.md`**: detailed topic-specific rules

## Definition of Done for Recommendations

Every implementation recommendation should include:

1. **File-level target**: concrete file(s) to change/create
2. **Evidence linkage**: why this step is needed, with artifact reference
3. **Activation condition**: when a target-state rule becomes enforceable
4. **Acceptance signal**: what artifact/output proves completion
