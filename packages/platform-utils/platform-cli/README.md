# @prosto/platform-cli

`@prosto/platform-cli` is the published command-line package scaffold for
Prosto Platform. Its `prosto-platform` binary is reserved for future platform
scaffolding and validation commands.

The current binary intentionally has no implemented subcommands. Do not rely on
it for project generation, validation, or runtime administration yet.

## Requirements

- Node.js >= 22.23.0
- npm >= 10

## Installation

```bash
npm install --global @prosto/platform-cli
```

## Scripts

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run build --workspace=@prosto/platform-cli` | Build the ESM package and binary. |
| `npm run typecheck --workspace=@prosto/platform-cli` | Type-check the package. |
| `npm run test --workspace=@prosto/platform-cli` | Run the test suite once. |
