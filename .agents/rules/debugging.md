# Debugging Rules

## Repository State Awareness

- In current repository state, lint commands plus `test:contracts` are available in root `package.json`.
- If a task asks to run a single test, check package-level scripts first (for example `@prosto/platform-sdk`), because there is no root-level single-test entrypoint.
- Core lifecycle orchestration, module loading, persistence initialization, and
  runtime diagnostics are implemented; check the current source and package
  manifests before treating an architecture rule as implemented behavior.
- Treat failures due to non-existent `packages/*` paths as repository-state mismatch unless those directories are actually added.
- If import/runtime issues appear after adding JS/TS files, first validate ESM assumptions because root package is `"type": "module"`.

## Debugging Workflow

1. **Check repository state first** — verify which files and scripts actually exist before assuming capabilities
2. **Validate ESM** — if import errors appear, check that `.js` extensions are used in relative imports
3. **Check package boundaries** — if cross-package imports fail, verify the dependency is allowed per architecture rules
4. **Review boundaries manually** — no dedicated architecture-validation script
   exists; inspect package manifests and imports, then run lint and type checks
5. **Check test isolation** — if tests fail, verify mock setup and test data cleanup

## Common Pitfalls

- Confusing architecture docs (target state) with implemented code (current state)
- Using `npm install` instead of `npm ci` in CI environments
- Forgetting `.js` extension in ESM relative imports
- Importing from `platform-core` in adapters (boundary violation)
- Importing between modules (coupling violation)
- Assuming commands exist without checking `package.json`
