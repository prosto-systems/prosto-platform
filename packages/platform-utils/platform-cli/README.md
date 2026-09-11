# @prosto/platform-cli

`@prosto/platform-cli` is a publishable command-line package scaffold for
Prosto Platform. Its `prosto-platform` binary is reserved for future platform
scaffolding and validation commands.

The current binary intentionally has no implemented subcommands. Do not rely on
it for project generation, validation, or runtime administration yet.

## Requirements

- Node.js >= 22.23.0
- npm >= 10

## Workspace Setup

Install dependencies from the repository root. The package manifest declares a
binary, but does not establish that a release is available from an npm registry.

```bash
npm install
```

## Scripts

Run these commands from the repository root:

Direct workspace commands do not build dependencies automatically. The root
`npm run build` builds workspaces in dependency order after installation.

| Command                                              | Purpose                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `npm run build --workspace=@prosto/platform-cli`     | Build the ESM package and binary.                                             |
| `npm run typecheck --workspace=@prosto/platform-cli` | Type-check the package.                                                       |
| `npm run test --workspace=@prosto/platform-cli`      | Run Vitest with `--passWithNoTests`; no test cases are currently implemented. |
