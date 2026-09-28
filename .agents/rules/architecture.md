# Architecture Guidelines

## Project Overview

- **Project Type**: Headless platform, expandable with plug-in modules
- **Language**: TypeScript
- **Architecture**: Micro-core architecture (headless design)
- **Purpose**: Provide a flexible platform for building applications

## Micro-core Architecture

- Maintain a minimal platform core with expansion through plug-in modules
- Use clear module boundaries and interfaces
- Ensure modules are independently testable and deployable
- Document module APIs and dependencies
- Follow consistent naming conventions across modules

## Core Design Principles

- **Object-Oriented Design**: Prefer object-oriented composition for production code when it improves clarity, extensibility, and testability
- **Clean Architecture**: Keep domain policies independent from framework and infrastructure details
- **SOLID**: Apply all SOLID principles explicitly in design and refactoring
- **Single Responsibility**: Each module should have one reason to change
- **Loose Coupling**: Minimize dependencies between modules
- **High Cohesion**: Related functionality should be grouped together
- **Dependency Injection**: Use DI for better testability and flexibility
- **Interface Segregation**: Define small, focused interfaces

## Package Boundary Rules

### `platform-core` MUST:

- Own lifecycle orchestration, service registry, event/hook bus, configuration
  validation, module loading, compatibility checks, and sanitized runtime and
  declared-admin-asset catalogs
- Remain minimal and long-lived
- Import only from `platform-sdk` and vetted runtime libraries

### `platform-core` MUST NOT:

- Import from adapter packages
- Import feature modules
- Own HTTP framework specifics
- Own ORM/persistence specifics
- Own vendor integrations
- Own feature domain logic

An application selects concrete adapters, while `RuntimeBuilder` orchestrates
their SDK lifecycle contracts. Every runtime requires exactly one admin,
persistence, and HTTP adapter; HTTP-less, persistence-less, and worker-only
profiles are unsupported. `@prosto/platform-sdk` owns framework-neutral HTTP
contracts and `@prosto/platform-adapter-fastify` owns Fastify transport and
listening. Core owns neither Fastify nor TypeORM types.

`@prosto/platform-app` is the outer composition root for the default
Fastify/TypeORM/administration preset or a complete custom SDK adapter set. It
owns process signals, graceful restart, and host cleanup; neither core nor SDK
imports it. A managed host must stop through its app handle rather than calling
`handle.runtime.stop()` directly.

### `platform-sdk` MUST:

- Keep external runtime dependencies minimal and justified
- Prefer TypeScript and platform-native APIs
- Export contracts, schemas, tokens, and shared contract-support utilities, not
  runtime orchestration or framework transport implementations

### `platform-sdk` MUST NOT:

- Depend on other platform runtime packages
- Own full contract conformance test suites (that's `platform-utils/platform-contract-tests`)

### Adapters MAY:

- Depend on `platform-sdk`
- Depend on framework-specific libraries (Fastify, Express, etc.)

### Adapters MUST NOT:

- Depend on other adapters' internals. The TypeORM-backed administration adapter
  may depend on the public SPI exported by `platform-adapter-typeorm`.
- Depend on feature modules
- Leak framework-specific types into neutral SDK contracts. The TypeORM
  adapter's documented public persistence SPI intentionally uses TypeORM types;
  the HTTP adapter's public composition API remains framework-neutral.

### HTTP application boundary

- Modules declare SDK endpoints only through
  `context.capabilities.http.endpoints` during `init()`; they do not receive
  adapter instances or framework hooks.
- `RuntimeBuilder` initializes persistence, HTTP, then administration adapters;
  starts persistence before modules, administration after final catalogs, and
  HTTP listening last. It closes HTTP before administration, modules, and
  persistence during shutdown.
- `/health` and `/ready` are public infrastructure probes, not the admin shell's
  `/api/admin/platform/health`. `platform-adapter-fastify` optionally hosts the
  shell SPA and hosts framework-neutral endpoints; the required
  `platform-adapter-admin-typeorm` owns production admin/auth/plugin-asset
  policy through SDK contracts. `platform-admin` is not a module and must be
  excluded from module views. Core owns neither Fastify types nor listening.

### Modules MUST:

- Only import from `platform-sdk` in their public API
- Declare compatibility metadata in manifest

### Modules MUST NOT:

- Import from `platform-core` internals
- Import from other modules' internals
- Have side effects at import time

## Current vs Target State

- Keep a hard distinction between current-state repository and target-state architecture
- Treat the boundary rules as constraints for future implementation planning;
  validate claims about implemented behavior against source and package manifests
- Feature modules may be developed in separate repositories; this repository
  also contains example modules under `examples/`

See [ADR 0001](../../docs/adr/0001-required-runtime-adapters.md) for the required
runtime adapter decision. The SDK has no root export: backend contracts use
`@prosto/platform-sdk/platform`, shared admin HTTP schemas use `/admin/http`,
frontend contracts use `/admin`, and generic utilities use `/utils`.

The ADR's implementation-status section confirms enforced lifecycle guarantees:
composition validation rejects duplicate IDs and reused instances before side
effects; failed startup and normal shutdown share reverse-order cleanup; and
every required-adapter failure publishes final startup and shutdown reports.
Keep adapter diagnostics separate from module diagnostics and identifiers.

## Contract Authority Split

- `platform-sdk` owns contracts
- `platform-utils/platform-contract-tests` owns full conformance suites
- Avoid merging these responsibilities

## Admin UI Model

- Hybrid separation: separate `admin-shell`, contract package `platform-sdk`
- No UI runtime in `platform-core`

## Kernel Component Model

- Pre-start acyclic dependency resolution
- Structured lifecycle error mapping fields (`moduleId`, `errorCode`, `remediationHint`)

## Error Handling Strategy

The following is an illustrative domain-service pattern, not a platform API.
Use SDK/core error contracts for actual runtime diagnostics.

```typescript
// Custom error classes
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Proper error handling
async function processUser(userData: unknown): Promise<User> {
  if (!isValidUser(userData)) {
    throw new ValidationError('Invalid user data', 'userData');
  }

  try {
    return await userService.create(userData);
  } catch (error) {
    logger.error('Failed to create user', error);
    throw new ServiceError('User creation failed', error);
  }
}
```

## Implementation Constraints

- Require object-oriented composition, Clean Architecture dependency direction, and SOLID-driven decomposition as first-class design constraints
