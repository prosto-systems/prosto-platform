# Project Coding Rules (Non-Obvious Only)

- Repository currently has no `src/`, no root `tsconfig.json`, and no runtime packages from architecture docs; treat `.context/` package layouts as target-state, not editable code locations.
- Root `package.json` defines only TypeScript compile commands (`build`, `dev`, `typecheck`); no lint/test scripts exist, so do not claim eslint/jest commands as available.
- There is no configured single-test runner command in current repo state; if adding tests, first add tooling and scripts explicitly.
- Effective enforced formatting comes from `.editorconfig` only: LF, 2 spaces, max line length 120, with markdown line length disabled.
- Because root package is ESM (`"type": "module"`), prefer ESM-compatible imports/exports for any new TS/JS files.
- Existing `.cursor/rules/*.md` and `.clinerules/*.md` are generic guidance; when conflicts appear, prefer concrete repository config files and scripts.
