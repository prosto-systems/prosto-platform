# prosto-platform

A TypeScript-based headless platform with a micro-core architecture and expandable with plug-in modules.

## Project Status

Current repository state (as of 2026-04-03): **Phase 04 completed and validated (contract conformance suite + reference module validation active), with Phase 05 as the next implementation window**.

What this means right now:
- Phase 01 governance workflows and required-check policy are in place under [`.github/workflows/`](.github/workflows/) and [`docs/governance/`](docs/governance/).
- Phase 02 workspace baseline is implemented under [`packages/`](packages/) with package manifests, entry points, and per-package TypeScript configs.
- Phase 03 SDK contract authority is implemented in [`packages/platform-sdk/`](packages/platform-sdk/) with manifest schema validation, lifecycle interfaces, typed tokens, compatibility helpers, and SDK tests.
- Shared TypeScript baseline is active at [`packages/@internal/tsconfig/base.json`](packages/@internal/tsconfig/base.json).
- Phase 02 boundary checks are executable via `lint:architecture`, `validate:dependency-policy`, `validate:module-graph`, and `validate:public-api-boundary`.
- Runtime policy and lifecycle determinism checks are pending for later phases (`validate:runtime-policy` and `test:lifecycle-determinism` remain placeholders).
- Contract conformance gate is active via `test:contracts`, backed by `@prosto/platform-contract-tests` and reference modules in `examples/`.

## Current State vs Target State

### Current State (repository reality)
- Workspace monorepo baseline with package entry points and strict TypeScript configuration.
- Primary operational policy for AI agents: [`AGENTS.md`](AGENTS.md).
- Architecture intent and roadmap are documented under `.context/`.
- Runtime behavior is still pre-implementation and begins in upcoming phases.

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
1. Implement runtime lifecycle foundation (Phase 05).
2. Activate security and performance hardening gates (Phase 06).
3. Implement admin enablement contracts and BFF stream (Phases 07-08).
