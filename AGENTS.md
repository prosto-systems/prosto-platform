# AI Programming Agents Guidelines

## Project Overview

**prosto-platform** is a headless platform, expandable with plug-in modules and written in TypeScript. This document is the entry point for AI programming assistants. Detailed rules are in `.agents/rules/` directory.

## Detailed Rules by Topic

All detailed rules are in `.agents/rules/` directory:

| File                              | Topic                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `.agents/rules/architecture.md`   | Micro-core architecture, package boundaries, OOP/SOLID/Clean Architecture, error handling |
| `.agents/rules/contract-first.md` | Contract-first methodology, SDK contract priority, stability levels, type safety          |
| `.agents/rules/typescript.md`     | TypeScript configuration, ESM imports, type definitions, import organization              |
| `.agents/rules/testing.md`        | Vitest, test pyramid, AAA pattern, contract testing, mocking strategy                     |
| `.agents/rules/security.md`       | Module loading security, Zod validation, secret management, trust model                   |
| `.agents/rules/monorepo.md`       | Package boundaries, dependency policy, Turborepo, build orchestration, versioning         |
| `.agents/rules/observability.md`  | Redacted console logging, structured reports, health/readiness, observability gaps        |
| `.agents/rules/debugging.md`      | Debug workflow, repository state awareness, common pitfalls                               |
| `.agents/rules/ai-behavior.md`    | AI agent behavior, first-time scan, rule precedence, command policy                       |

## Key Rules Summary

### Architecture

- **Micro-core architecture**: minimal platform core, expansion through plug-in modules
- **Contract-first**: define types in `platform-sdk` BEFORE implementing in `platform-core`
- **SDK imports**: use `/platform`, `/admin`, `/admin/http`, or `/utils`; the SDK has no root export
- **Package boundaries**: `platform-core` MUST NOT import from adapters or modules; modules MUST NOT import from other modules
- **Repository authority**: source code and package manifests define current behavior; architecture documentation defines constraints for future changes
- **Required adapters**: `RuntimeBuilder` requires exactly one admin, persistence, and HTTP adapter; HTTP-less, persistence-less, and worker-only starts are unsupported
- **HTTP boundary**: SDK owns neutral HTTP contracts; `platform-adapter-fastify` owns Fastify transport/listening while core orchestrates lifecycle only through SDK contracts

### Code Style

- **TypeScript strict mode** with ESM (`"type": "module"`, `.js` extensions in relative imports)
- **Naming**: PascalCase classes, `I`-prefixed interfaces, `Type`-suffixed type aliases, camelCase variables/functions, UPPER_SNAKE_CASE constants, kebab-case files (see ESLint for augmentation exceptions)
- **OOP, SOLID, Clean Architecture** for all new code
- **No `any` type** — use union types and type guards

### Publishable Adapter, Module, and Package Layouts

- All adapter packages MUST live under `packages/platform-adapters/`; shared utility workspaces live under `packages/platform-utils/`, and other platform packages remain direct children of `packages/`.
- `platform-adapter-admin-typeorm` is a directly composed adapter, not a discoverable module; it may use only the public TypeORM adapter SPI.
- Every new publishable adapter, or package MUST follow the `packages/platform-adapters/platform-adapter-typeorm`, or `packages/platform-core` layouts: root `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, root implementation files in `src/`, and `tests/`.
- Do not place constants, errors, interfaces, or utilities directly in `src/` when creating or modifying a publishable adapter or package.

### Security

- **Zod validation** at all boundaries
- **Secret redaction** from core module logs through `SecretsRedactor` and `ConsoleModuleLogger`
- **MSW 2** is available in `platform-admin-shell` for opt-in browser development mocks and Vitest integration mocks; it is not a production backend
- **Admin plugins** are trusted first-party ESM code. The admin runtime is an API boundary, not a sandbox.
- **HTTP streams** are untrusted and one-shot. Modules must validate request data and consume or cancel raw/multipart file streams before returning a response.
- **Adapter configuration** is scoped to immutable `adapters.<adapterId>` values. Do not use the legacy `modules.platform-admin` location; validation rejects every matching `modules.<adapterId>` entry, including when the adapter-scoped entry exists.

### Admin Integration

- The `@alpha` admin plugin registration context provides auth, translation, workspace, main-menu, blade, and blade-toolbar services.
- Follow `packages/platform-admin-shell/README.md` for the admin plugin manifest, shared-runtime imports, and workspace lifecycle contract.

### Module Loading

- `platform-core` discovers local module packages below `platform.discoveryPath`; modules are not passed through `RuntimeBuilder` options.
- `platform-admin` is reserved for the required admin adapter and must not occur in a discovered manifest, module graph, module catalog, or readiness module IDs.
- A discoverable package contains `manifest.json`, `package.json`, and a built `dist/` directory. Prefer a `./platform` package export for the ESM entry.
- Validated builds are loaded from `platform.probingPath`. Use `refreshProbingFolderOnStart` for startup refreshes or `IPlatformRuntime.invalidateProbingFolder()` to request a complete rebuild on the next startup.
- URL, registry, archive, checksum, and in-memory artifact sources are not implemented by the current core loader.

### Testing

- **Vitest** as test runner (`npm run test`, `npm run test:contracts`)
- **Contract tests** mandatory for all modules before integration
- **AAA pattern**: Arrange, Act, Assert
- **Runtime adapters**: cover role/identity validation, fatal lifecycle failures, rollback, reverse shutdown, scoped contributions, and diagnostics with SDK-only fakes in core tests.
- **HTTP adapters**: cover endpoint collection, lifecycle cleanup, sanitized errors, request limits, cancellation, and probe behavior with focused adapter tests.

### Git & Workflow

- Feature branches, conventional commits, PR review required
- Build, tests, type checking, lint, and review are merge requirements; no `.github/workflows/` CI configuration is currently checked in

## ⚠️ Critical Rules for AI Agents

### Rule Precedence

When guidance conflicts, use this precedence order:

1. **Repository reality** (source of truth): concrete files and scripts in repo
2. **`AGENTS.md`**: operational policy for all agents in this repository
3. **`.agents/rules/*.md`**: detailed topic-specific rules
4. target-state architecture docs, design intent and roadmap

### Repository Readiness Truth Table

**BEFORE making recommendations about commands, tooling, or process maturity, verify these artifacts:**

1. `packages/platform-utils/tsconfig/base.json`, plus direct and nested workspace `tsconfig.json` files
2. `packages/`
3. `.github/workflows/`
4. test runner config (`vitest.config.*`)
5. lint config (`eslint.config.*`)

### Command and Capability Claim Policy

- Only list scripts present in current root or relevant workspace `package.json`, and identify workspace-specific commands explicitly
- Do not claim commands unless scripts/configs exist in repository artifacts
- For unavailable capabilities, state the gap

### Architecture Boundary Rules

**DO NOT:**

- Import from `platform-core` into adapters (boundary violation)
- Add framework dependencies to core packages
- Ignore ADR constraints when proposing changes
- Add admin shell runtime, frontend framework, or UI rendering dependencies to `platform-core`
- Bypass admin integration contracts with direct module-to-shell coupling

**DO:**

- Design implementation with object-oriented composition and explicit abstractions
- Keep Clean Architecture dependency direction toward stable inner policies
- Enforce SOLID trade-offs explicitly during design and code review
- Use contract-first approach (types before implementation)
- Follow micro-core boundary principles
- Validate dependencies against package boundaries
- Reference ADRs when proposing architecture changes
- Follow [ADR 0001](docs/adr/0001-required-runtime-adapters.md) for required runtime adapter composition
- Preserve the ADR's enforced lifecycle guarantees: strict adapter composition validation, shared reverse-order cleanup, and final startup/shutdown reporting for required-adapter failures
- Keep admin integration in hybrid model: separate `admin-shell`, and contract package

### Documentation Requirements

**ALWAYS:**

- Update AGENTS.md if adding new commands or tools
- Reference architecture docs
- Document public APIs with JSDoc comments
- Include stability level (`@stable`/`@beta`/`@alpha`/`@experimental`/`@internal`)

## Development Environment

### Required Tools

- Node.js >= 22.23 (see `package.json` engines)
- npm >= 10
- TypeScript compiler (dependency)
- Vite 8 and `vite-plugin-dts` for publishable package builds
- `@prosto/platform-admin-vite` provides the shared Vue ecosystem runtime transform (`vue`, `vue-i18n`, `pinia`, `vue-router`, and Vuetify) for admin module artifacts; configure it after the Vue and Vuetify Vite plugins
- MSW 2 in `@prosto/platform-admin-shell` for browser development and Vitest API mocks
- Git for version control
- Turborepo (for monorepo task orchestration)

### Common Commands

```bash
npm run build          # Build all packages with dependency ordering
npm run dev            # Start available workspace development tasks
npm run test           # Run tests across workspaces
npm run test:contracts # Run workspaces that provide contract tests
npm run typecheck      # Type-check workspaces
npm run lint           # Run ESLint
npm run format         # Check formatting with Prettier
npm run test --workspace=@prosto/platform-admin-vite      # Test admin runtime Vite integration
npm run build --workspace=@prosto/platform-admin-vite     # Build admin runtime Vite integration
npm run typecheck --workspace=@prosto/platform-admin-vite # Type-check admin runtime Vite integration
npm run test --workspace=@prosto/platform-adapter-fastify # Test Fastify HTTP adapter
npm run build --workspace=@prosto/platform-adapter-fastify # Build Fastify HTTP adapter
npm run typecheck --workspace=@prosto/platform-adapter-fastify # Type-check Fastify HTTP adapter
```

Root Turborepo test/typecheck tasks build workspace dependencies first; direct
workspace commands require their dependencies to have been built already.
`.prettierignore` excludes Markdown, so the root formatting check does not
validate documentation. There is no dedicated architecture-boundary check;
review imports and package manifests in addition to lint and type checking.

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [OWASP Security Guidelines](https://owasp.org/)
- [Clean Code Principles](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

---

**Last Updated**: 2026-09-16
**Version**: 1.4.0
