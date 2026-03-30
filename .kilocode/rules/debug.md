# Project Debug Rules (Non-Obvious Only)

- In current repository state, lint and architecture-policy commands are available in root `package.json`, while several runtime/conformance checks remain placeholders by phase design.
- If a task asks to run a single test, check package-level scripts first (for example `@prosto/platform-sdk`), because there is no root-level single-test entrypoint.
- Many architecture constraints are documented under `.context/02-architecture-design/*` and may not map to real runtime code paths yet.
- Treat failures due to non-existent `packages/*` paths as repository-state mismatch unless those directories are actually added.
- If import/runtime issues appear after adding JS/TS files, first validate ESM assumptions because root package is `"type": "module"`.
