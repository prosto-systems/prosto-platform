# Project Coding Rules (Non-Obvious Only)

- Repository has package-level `src/` implementations under `packages/*` and uses package-level `tsconfig.json`; treat `.context/` package layouts as target-state guidance, not direct proof of implemented runtime behavior.
- Root `package.json` includes lint and architecture-policy scripts (`lint`, `lint:fix`, `lint:architecture`, `validate:*`) plus active `test:contracts`; `validate:runtime-policy` and `test:lifecycle-determinism` remain placeholders.
- There is no root-level single-test runner command, but `@prosto/platform-sdk` has package-level Vitest tests.
- Effective formatting/lint baselines come from `.editorconfig` and `eslint.config.mjs`.
- Because root package is ESM (`"type": "module"`), prefer ESM-compatible imports/exports for any new TS/JS files.
- Existing `.cursor/rules/*.md` and `.clinerules/*.md` are generic guidance; when conflicts appear, prefer concrete repository config files and scripts.
