# Monorepo Rules

## Package Boundaries

### Core Boundary Rules

**`platform-core` MUST:**

- Own lifecycle orchestration, service registry, event/hook bus, configuration
  validation, module loading, compatibility checks, and sanitized runtime and
  declared-admin-asset catalogs
- Remain minimal and long-lived
- Import only from `platform-sdk` and vetted runtime libraries

**`platform-core` MUST NOT:**

- Import from adapter packages
- Import feature modules
- Own HTTP framework specifics
- Own ORM/persistence specifics
- Own vendor integrations
- Own feature domain logic

Applications compose exactly one admin, persistence, and HTTP adapter through
`RuntimeBuilder`; the core orchestrates only their SDK contracts and does not
select concrete implementations. HTTP-less runtime profiles are unsupported.
The Fastify transport adapter is `packages/platform-adapters/platform-adapter-fastify`;
it depends on the SDK and Fastify without exposing Fastify types in its public
API.

**`platform-sdk` MUST:**

- Keep external runtime dependencies minimal and justified
- Prefer TypeScript and platform-native APIs
- Export contracts, schemas, tokens, and shared contract-support utilities; do
  not move runtime orchestration or transport implementations into the SDK

**`platform-sdk` MUST NOT:**

- Depend on other platform runtime packages
- Own full contract conformance test suites (that's `platform-utils/platform-contract-tests`)

**Adapters MAY:**

- Depend on `platform-sdk`
- Depend on framework-specific libraries (Fastify, Express, etc.)

**Adapters MUST NOT:**

- Depend on other adapters' internals. `platform-adapter-admin-typeorm` may
  depend on the public SPI exported by `platform-adapter-typeorm`.
- Depend on feature modules
- Leak transport-specific types into neutral SDK contracts. The TypeORM adapter
  intentionally exposes TypeORM types through its documented persistence SPI.

**Modules MUST:**

- Only import from `platform-sdk` in their public API
- Declare compatibility metadata in manifest

**Modules MUST NOT:**

- Import from `platform-core` internals
- Import from other modules' internals
- Have side effects at import time

---

## Import Rules

### Cross-Package Imports

```typescript
// ✅ Good: Using @prosto/* scoped imports for cross-package
import type { IPlatformModule } from '@prosto/platform-sdk/platform';
// Application composition only, never in adapters or feature modules:
import { RuntimeBuilder } from '@prosto/platform-core';

// ✅ Good: Relative imports within same package
import { UserService } from './services/user.service.js';

// ❌ Bad: Direct cross-package relative imports
import { IPlatformModule } from '../../platform-sdk/src/platform/interfaces';
```

### Import Organization

```typescript
// 1. Node.js built-in modules
import { EventEmitter } from 'node:events';

// 2. Third-party dependencies
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

// 3. Platform SDK (contract package)
import {
  type IPlatformModule,
  type PlatformModuleLifecycleStageType,
} from '@prosto/platform-sdk/platform';

// 4. Platform core (application composition only)
import { InMemoryServiceRegistry } from '@prosto/platform-core';

// 5. Same-package imports (relative)
import type { IUser } from '../interfaces/user.interface.js';
import { UserService } from './services/user.service.js';
```

---

## Dependency Policy

### Allowed Dependencies Matrix

| Package                                  | Can Depend On                                                               | Cannot Depend On                                   |
| ---------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| `platform-sdk`                           | Minimal vetted external libs                                                | Other PROSTO runtime packages                      |
| `platform-core`                          | `platform-sdk`, vetted runtime libs                                         | Adapters implementations, feature modules          |
| `platform-utils/platform-contract-tests` | `platform-sdk`, test framework                                              | `platform-core`, adapters implementations          |
| `platform-utils/platform-cli`            | `platform-sdk`                                                              | `platform-core` runtime internals                  |
| `platform-adapter-*`                     | `platform-sdk`, framework libs, explicit public adapter SPI when documented | Other adapters internals, feature modules          |
| `modules`                                | `platform-sdk`, approved third-party libs                                   | `platform-core` internals, other modules internals |

### Dependency Validation

No dedicated dependency-policy, architecture-lint, or public-API-boundary
script exists at the repository root. Validate the implemented checks with
`npm run lint`, `npm run typecheck`, and the relevant package tests; review
package manifests and imports when changing a package boundary.

### Adding New Dependencies

**For `platform-sdk`:**

1. Justify why dependency is essential for contract
2. Architecture review required
3. Consider if dependency can be in consumer packages instead

**For `platform-core`:**

1. Verify dependency doesn't violate boundary
2. Check for security vulnerabilities
3. Prefer dependencies already used in SDK

**For Adapters:**

1. Framework-specific dependencies allowed
2. Keep in adapter package scope only
3. Document framework version requirements

`@prosto/platform-adapter-fastify` owns `fastify@^5.12.1`,
`@fastify/multipart@^10.1.1`, and `zod`; these dependencies must not migrate to
`platform-core`.

---

## Workspace Configuration

### Directory Layout

- Adapter workspaces live in `packages/platform-adapters/platform-adapter-*/`.
- `platform-adapter-admin-typeorm` is directly composed under that directory; it
  is not a discoverable module and has no `manifest.json` or `./platform` export.
- Independently deployed modules may live in separate repositories; this repo
  includes example modules under `examples/`.
- Shared utility workspaces live under `packages/platform-utils/`; other platform workspaces remain direct children of `packages/`.
- Root workspace globs are `packages/*`, `packages/*/*`, and `examples/*`.
  The nested `module-order` example is built by its host example's scripts,
  not registered as an additional root npm workspace.

### Turborepo Configuration

The project uses Turborepo for monorepo task orchestration.

**Pipeline Tasks** (defined in `turbo.json`):

- `build` - Builds publishable packages with Vite 8 and emits declarations via `vite-plugin-dts` (depends on `^build` for dependency order)
- `typecheck` - Type checking (depends on `^build`)
- `test` - Runs test suites (depends on `^build`)
- `test:contracts` - Runs workspaces that provide this task (depends on `^build`)
- `bench` - Dependency-ordered benchmark task; there is no root `bench` script
- `lint` / `lint:fix` / `format` / `format:fix` - Linting and formatting tasks
- `dev` - Development mode (no cache, persistent)

The root lint and formatting scripts invoke ESLint and Prettier directly, not
Turborepo. Markdown is excluded by `.prettierignore`. No `.github/workflows/`
CI configuration is checked in.

**Common Commands**:

```bash
npm run build                                 # Build all packages with dependency ordering
npm run test                                  # Run tests across workspaces
npm run typecheck                             # Type-check workspaces
npm run dev                                   # Start available workspace development tasks
npm run build --workspace=@prosto/platform-sdk # Build the SDK package
npm run test --workspace=@prosto/platform-adapter-fastify # Test Fastify adapter
npm run typecheck --workspace=@prosto/platform-adapter-fastify # Type-check Fastify adapter
```

---

## Build Orchestration

### Build Dependency Graph

```
platform-sdk (base)
    ↓
platform-core, platform-adapter-*, platform-contract-tests, platform-cli,
platform-admin-vite, platform-admin-shell
    ↓
examples and application compositions
```

The TypeORM adapter currently depends on the SDK and TypeORM, not on
`platform-core`. Always use package manifests as the authority for a workspace's
actual dependency graph.

### Build Order

1. `platform-sdk` - must build first (contract authority)
2. `platform-core` - depends on SDK
3. `platform-utils/platform-contract-tests` - depends on SDK
4. `platform-utils/platform-cli` - depends on SDK
5. `platform-adapter-*` - depends on SDK and adapter-specific libraries
6. Admin Vite integration and admin shell - depend on SDK
7. Example modules and application compositions - depend on the packages they compose

This is a dependency outline, not a mandatory serial ordering of independent
packages. The administration adapter additionally depends on the TypeORM
adapter's public SPI. Root tests and type checks build dependencies first;
direct workspace scripts require those dependencies to be built already.

---

## Versioning Strategy

### SDK Contract Versioning

| Change Type                   | Version Bump | Example                         |
| ----------------------------- | ------------ | ------------------------------- |
| Breaking contract change      | Major        | Remove required lifecycle field |
| Backward-compatible extension | Minor        | Add optional manifest field     |
| Non-breaking fix              | Patch        | Correct type narrowing          |

### Core Runtime Versioning

| Change Type                 | Version Bump | Example                            |
| --------------------------- | ------------ | ---------------------------------- |
| Breaking runtime behavior   | Major        | Lifecycle ordering contract change |
| Backward-compatible feature | Minor        | New optional policy hook           |
| Bug or performance fix      | Patch        | Fix memory leak                    |

### Module Versioning

Modules are independently versioned with compatibility metadata:

```json
{
  "name": "@prosto/platform-module-health",
  "version": "1.2.3",
  "peerDependencies": {
    "@prosto/platform-sdk": "^0.x"
  }
}
```
