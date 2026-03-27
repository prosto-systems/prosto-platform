# Project Debug Rules (Non-Obvious Only)

- In current repository state, missing test/lint commands are expected behavior, not a broken setup: `package.json` only has TypeScript compile/typecheck scripts.
- If a task asks to run a single test, diagnose first as tooling gap: there is no test framework wiring or script entrypoint yet.
- Many architecture constraints are documented under `.context/02-architecture-design/*` and may not map to real runtime code paths yet.
- Treat failures due to non-existent `packages/*` paths as repository-state mismatch unless those directories are actually added.
- If import/runtime issues appear after adding JS/TS files, first validate ESM assumptions because root package is `"type": "module"`.
