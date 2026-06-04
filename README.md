# Prosto Platform

A TypeScript-based **headless platform** built on a micro-core architecture with plug-in module extensibility. Designed for teams that need a secure, observable, and contract-first foundation for modular backend systems.

## Key Features

- **Micro-core architecture** — minimal kernel, everything else is a plug-in module
- **Contract-first development** — types and interfaces defined in `platform-sdk` before any implementation
- **Security-first module loading** — checksum integrity verification and secret redaction
- **Observability built-in** — structured logging, diagnostics, health/readiness probes, metrics
- **Policy-as-code** — architecture boundaries, dependency layering, and runtime policies enforced in CI
- **Performance regression gates** — startup and event-dispatch benchmarks with automatic drift detection

## Packages

| Package | Purpose |
|---------|---------|
| [`@prosto/platform-sdk`](packages/platform-sdk) | Contract authority — schemas, validators, lifecycle interfaces, typed tokens |
| [`@prosto/platform-core`](packages/platform-core) | Minimal runtime kernel — bootstrap, modularity, events, security, caching, diagnostics |
| [`@prosto/platform-admin-contracts`](packages/platform-admin-contracts) | Admin integration contracts — UI plugin manifests, discovery payloads, permissions, compatibility |
| [`@prosto/platform-cli`](packages/platform-cli) | CLI scaffolding and validation utilities |
| [`@prosto/platform-adapter-http`](packages/platform-adapter-http) | HTTP transport adapter |
| [`@prosto/platform-contract-tests`](packages/platform-contract-tests) | Reusable contract conformance tests for modules |

## Quick Start

```bash
# Install dependencies
npm install

# Build all packages
turbo build

# Run tests
turbo test

# Run contract tests
npm run test:contracts
```

### Development Commands

```bash
turbo dev              # Start dev mode across all packages
turbo typecheck        # Type check all packages
npm run lint           # Lint with ESLint
npm run lint:fix       # Auto-fix lint issues

# Architecture & dependency validation
npm run lint:architecture
npm run validate:dependency-policy
npm run validate:module-graph
npm run validate:public-api-boundary
npm run validate:runtime-policy

# Performance benchmarks
npm run bench:startup
npm run bench:events
npm run bench:regression
```

## Architecture

The platform enforces strict dependency direction:

```
platform-sdk  (innermost — contract authority, zero runtime dependencies)
     ↑
platform-core (runtime kernel, depends only on sdk)
     ↑
adapters / CLI / modules (depend on sdk, must NOT import core)
```

Key architectural decisions are documented as ADRs in [`.context/02-architecture-design/adr/`](.context/02-architecture-design/adr/):

- **ADR-0001** — Micro-core kernel boundary and package isolation
- **ADR-0002** — SDK contract and semver governance
- **ADR-0003** — Module loading security (allowlist + integrity)
- **ADR-0004** — Lifecycle orchestration and startup policies
- **ADR-0009** — Admin UI hybrid shell plugin model

Full architecture diagrams (C4, DFD, sequence) are in [`.context/02-architecture-design/`](.context/02-architecture-design/).

## Project Status

**Phase 07 completed. Phase 08 (admin BFF adapter and discovery pipeline) is active.**

Completed phases:
- **Phase 01** — Governance workflows and CI required-check policy
- **Phase 02** — Workspace monorepo baseline with package manifests and TypeScript configs
- **Phase 03** — SDK contract authority (schemas, lifecycle interfaces, validators)
- **Phase 04** — Contract conformance gate (`test:contracts`)
- **Phase 05** — Core runtime subsystems (bootstrap, module loader, event bus, service registry, diagnostics)
- **Phase 06** — Security hardening (secret redaction, integrity checks, config access policy, performance regression gates)
- **Phase 07** — Admin contract authority (`@prosto/platform-admin-contracts`) with UI plugin manifests, discovery payloads, permissions, compatibility rules, public exports, and validation tests

See the [implementation roadmap](.context/04-implementation-plan/) for full phase details.

## Documentation

| Document | Description |
|----------|-------------|
| [`.context/01-research/`](.context/01-research/) | Research and analysis |
| [`.context/02-architecture-design/`](.context/02-architecture-design/) | Architecture (C4, DFD, ADRs) |
| [`.context/03-work-plan/`](.context/03-work-plan/) | Work plan and recommendations |
| [`.context/04-implementation-plan/`](.context/04-implementation-plan/) | 10-phase implementation roadmap |
| [`AGENTS.md`](AGENTS.md) | AI agent operational policy |
| [`docs/architecture/`](docs/architecture/) | Architecture specifications |

## Contributing

1. Read [`AGENTS.md`](AGENTS.md) for operational rules and AI agent guidelines.
2. Follow contract-first workflow: define types in `platform-sdk` before implementing in `platform-core`.
3. Run architecture validation before committing: `npm run lint:architecture && npm run validate:dependency-policy`
4. Feature branches with conventional commits. PR review required.

## License

See [LICENSE](LICENSE) for details.
