# prosto-platform

A TypeScript-based headless platform with a micro-core architecture and plug-in module extensibility.

## Project Status

Current repository state: **Phase 02 completed (workspace and governance baseline active)**.

What this means right now:
- Phase 01 governance workflows and required-check policy are in place under [`.github/workflows/`](.github/workflows/) and [`docs/governance/`](docs/governance/).
- Phase 02 workspace baseline is implemented under [`packages/`](packages/) with package manifests, entry points, and per-package TypeScript configs.
- Shared TypeScript baseline is active at [`tsconfig.base.json`](tsconfig.base.json).
- Phase 02 boundary checks are executable via `lint:architecture`, `validate:dependency-policy`, `validate:module-graph`, and `validate:public-api-boundary`.
- Runtime and conformance implementations are still pending for later phases (`validate:runtime-policy`, `test:contracts`, `test:lifecycle-determinism` are placeholders).

## Current State vs Target State

### Current State (repository reality)
- Workspace monorepo baseline with package entry points and strict TypeScript configuration.
- Primary operational policy for AI agents: [`AGENTS.md`](AGENTS.md).
- Architecture intent and roadmap are documented under `.context/`.
- Runtime behavior is still placeholder-only and starts in upcoming phases.

### Target State (design intent)
- Monorepo with `platform-sdk`, `platform-core`, `platform-contract-tests`, adapters, and CLI packages.
- Contract-first development and policy-as-code boundary checks.
- Security-first module loading (allowlist + integrity), observability, and quality gates.

Target-state details are documented in the architecture pack [`README.md`](.context/02-architecture-design/README.md) and implementation roadmap [`README.md`](.context/04-implementation-plan/README.md).

## Documentation Map

- Research and analysis: [`.context/01-research/`](.context/01-research/README.md)
- Architecture design (C4/DFD/ADR): [`.context/02-architecture-design/`](.context/02-architecture-design/README.md)
- Work plan and recommendations: [`.context/03-work-plan/`](.context/03-work-plan/README.md)
- Phase-based roadmap (Phase 01-10, including Admin Enablement stream): [`.context/04-implementation-plan/`](.context/04-implementation-plan/README.md)

## Contributor and AI Agent Onboarding

1. Verify actual repository state first (files/scripts), then use target-state architecture docs.
2. Use [`AGENTS.md`](AGENTS.md) as the primary operational policy.
3. Do not claim lint/test/CI availability without matching repository artifacts.
4. Use phases from [`.context/04-implementation-plan/README.md`](.context/04-implementation-plan/README.md) for implementation planning.
5. Resolve rule conflicts using precedence rules defined in [`AGENTS.md`](AGENTS.md).

## Immediate Priorities

Current next priorities:
1. Establish SDK contract baseline (Phase 03).
2. Implement contract conformance tests (Phase 04).
3. Implement runtime lifecycle foundation (Phase 05).
