# Project Documentation Rules (Non-Obvious Only)

- Architecture docs in `.context/02-architecture-design/` describe intended platform design and governance, not implemented runtime code in this repo.
- When answering questions about available commands, source of truth is root `package.json`; lint and architecture-policy scripts are available, while several runtime/conformance checks are still placeholders.
- If asked about single-test execution, clarify there is no root-level single-test script, but `@prosto/platform-sdk` has package-level Vitest tests.
- Existing `.cursor/rules/*` and `.clinerules/*` contain mostly generic recommendations and can overstate current capabilities; verify against concrete repo files.
- README is intentionally minimal; most detailed context lives in `.context/` and should be labeled as design/draft context.
- For admin UI topics, treat hybrid model from `ADR-0009` as target-state default: separate `admin-shell`, `platform-admin-contracts`, and `platform-adapter-admin-bff`.
- Implementation sequencing now includes 10 phases with Admin Enablement stream in phases 07-09; avoid referencing old 7-phase roadmap.
