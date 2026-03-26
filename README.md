# prosto-platform

A TypeScript-based headless platform with a micro-core architecture and plug-in module extensibility.

## Project Status

Current repository state: **pre-implementation**.

What this means right now:
- Architecture and planning artifacts are in place.
- Runtime implementation has not started yet.
- The current repository does not contain `packages/`, `src/`, `tsconfig.json`, or `.github/workflows/`.
- Available commands are limited to scripts in [`package.json`](package.json): `build`, `dev`, `typecheck`.

## Current State vs Target State

### Current State (repository reality)
- Minimal project root with documentation-first assets.
- Primary operational policy for AI agents: [`AGENTS.md`](AGENTS.md).
- Architecture intent and roadmap are documented under `.context/`.

### Target State (design intent)
- Monorepo with `platform-sdk`, `platform-core`, `platform-contract-tests`, adapters, and CLI packages.
- Contract-first development and policy-as-code boundary checks.
- Security-first module loading (allowlist + integrity), observability, and quality gates.

Target-state details are documented in the architecture pack [`README.md`](.context/02-architecture-design/README.md) and implementation roadmap [`README.md`](.context/04-implementation-plan/README.md).

## Documentation Map

- Research and analysis: [`.context/01-research/`](.context/01-research/README.md)
- Architecture design (C4/DFD/ADR): [`.context/02-architecture-design/`](.context/02-architecture-design/README.md)
- Work plan and recommendations: [`.context/03-work-plan/`](.context/03-work-plan/README.md)
- Phase-based roadmap (Phase 01–07): [`.context/04-implementation-plan/`](.context/04-implementation-plan/README.md)

## Contributor and AI Agent Onboarding

1. Verify actual repository state first (files/scripts), then use target-state architecture docs.
2. Use [`AGENTS.md`](AGENTS.md) as the primary operational policy.
3. Do not claim lint/test/CI availability without matching repository artifacts.
4. Use phases from [`.context/04-implementation-plan/README.md`](.context/04-implementation-plan/README.md) for implementation planning.
5. Resolve rule conflicts using precedence rules defined in [`AGENTS.md`](AGENTS.md).

## Immediate Priorities

Before feature implementation:
1. Activate governance gates (Phase 01).
2. Create monorepo skeleton and package boundaries (Phase 02).
3. Establish SDK contract baseline (Phase 03).
