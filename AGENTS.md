# AI Programming Agents Guidelines

## Project Overview

**prosto-platform** is a headless platform, expandable with plug-in modules and written in TypeScript. This document is the entry point for AI programming assistants. Detailed rules are in `.agents/rules/` directory.

## Detailed Rules by Topic

All detailed rules are in `.agents/rules/` directory:

| File | Topic |
|------|-------|
| `.agents/rules/architecture.md` | Micro-core architecture, package boundaries, OOP/SOLID/Clean Architecture, error handling |
| `.agents/rules/contract-first.md` | Contract-first methodology, SDK contract priority, stability levels, type safety |
| `.agents/rules/typescript.md` | TypeScript configuration, ESM imports, type definitions, import organization |
| `.agents/rules/testing.md` | Vitest, test pyramid, AAA pattern, contract testing, mocking strategy |
| `.agents/rules/security.md` | Module loading security, Zod validation, secret management, trust model |
| `.agents/rules/monorepo.md` | Package boundaries, dependency policy, Turborepo, build orchestration, versioning |
| `.agents/rules/observability.md` | Pino logging, structured logs, startup report, health/readiness, metrics |
| `.agents/rules/debugging.md` | Debug workflow, repository state awareness, common pitfalls |
| `.agents/rules/ai-behavior.md` | AI agent behavior, first-time scan, rule precedence, command policy |

## Key Rules Summary

### Architecture
- **Micro-core architecture**: minimal platform core, expansion through plug-in modules
- **Contract-first**: define types in `platform-sdk` BEFORE implementing in `platform-core`
- **Package boundaries**: `platform-core` MUST NOT import from adapters or modules; modules MUST NOT import from other modules
- **Current vs Target state**: docs describe target architecture, not implemented code

### Code Style
- **TypeScript strict mode** with ESM (`"type": "module"`, `.js` extensions in relative imports)
- **Naming**: PascalCase classes/interfaces, camelCase variables/functions, UPPER_SNAKE_CASE constants, kebab-case files
- **OOP, SOLID, Clean Architecture** for all new code
- **No `any` type** — use union types and type guards

### Publishable Adapter, Module, and Package Layouts
- All adapter packages MUST live under `packages/platform-adapters/`; other publishable packages remain direct children of `packages/`.
- Every new publishable adapter, or package MUST follow the `packages/platform-adapters/platform-adapter-typeorm`, or `packages/platform-core` layouts: root `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, root implementation files in `src/`, and `tests/`.
- Do not place constants, errors, interfaces, or utilities directly in `src/` when creating or modifying a publishable adapter or package.

### Security
- **Zod validation** at all boundaries
- **Secret redaction** from logs (Pino `redact` config)

### Testing
- **Vitest** as test runner (`turbo test`, `turbo test:contracts`)
- **Contract tests** mandatory for all modules before integration
- **AAA pattern**: Arrange, Act, Assert

### Git & Workflow
- Feature branches, conventional commits, PR review required
- CI gates must pass before merge

## ⚠️ Critical Rules for AI Agents

### Rule Precedence
When guidance conflicts, use this precedence order:
1. **Repository reality** (source of truth): concrete files and scripts in repo
2. **`AGENTS.md`**: operational policy for all agents in this repository
3. **`.agents/rules/*.md`**: detailed topic-specific rules
4. target-state architecture docs, design intent and roadmap

### Repository Readiness Truth Table
**BEFORE making recommendations about commands, tooling, or process maturity, verify these artifacts:**
1. `packages/platform-utils/tsconfig/base.json`, and `packages/*/tsconfig.json`
2. `packages/`
3. `.github/workflows/`
4. test runner config (`vitest.config.*`)
5. lint config (`eslint.config.*`)

### Command and Capability Claim Policy
- Only list commands present in current root `package.json`
- Do not claim commands unless scripts/configs exist in repository artifacts
- For unavailable capabilities, state the gap

### Architecture Boundary Rules
**DO NOT:**
- Import from `platform-core` into adapters (boundary violation)
- Add framework dependencies to core packages
#- Ignore ADR constraints when proposing changes
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
- Git for version control
- Turborepo (for monorepo task orchestration)

### Common Commands
```bash
turbo build          # Build all packages with dependency ordering
turbo dev            # Start dev mode in all packages
turbo test           # Run tests across all packages
turbo typecheck      # Type check all packages
```

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [OWASP Security Guidelines](https://owasp.org/)
- [Clean Code Principles](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

---

**Last Updated**: 2026-08-18
**Version**: 1.0.0
