# Project Documentation Rules (Non-Obvious Only)

- Architecture docs in `.context/02-architecture-design/` describe intended platform design and governance, not implemented runtime code in this repo.
- When answering questions about available commands, source of truth is root `package.json`; currently there are no lint/test scripts.
- If asked about single-test execution, explicitly state it is not possible yet without adding a test runner and script wiring.
- Existing `.cursor/rules/*` and `.clinerules/*` contain mostly generic recommendations and can overstate current capabilities; verify against concrete repo files.
- README is intentionally minimal; most detailed context lives in `.context/` and should be labeled as design/draft context.
