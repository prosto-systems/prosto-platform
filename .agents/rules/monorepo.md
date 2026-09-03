# Monorepo Rules

## Package Boundaries

### Core Boundary Rules

**`platform-core` MUST:**
- Only own lifecycle orchestration, service registry, event/hook bus, configuration validation, module loading, and compatibility checks
- Remain minimal and long-lived
- Import only from `platform-sdk` and vetted runtime libraries

**`platform-core` MUST NOT:**
- Import from adapter packages
- Import feature modules
- Own HTTP framework specifics
- Own ORM/persistence specifics
- Own vendor integrations
- Own feature domain logic

The current core source exposes no HTTP application bootstrap. HTTP composition
belongs to an application or adapter, not `platform-core`.

**`platform-sdk` MUST:**
- Keep external runtime dependencies minimal and justified
- Prefer TypeScript and platform-native APIs
- Only export contracts, types, interfaces, tokens, and validation primitives

**`platform-sdk` MUST NOT:**
- Depend on other platform runtime packages
- Own full contract conformance test suites (that's `platform-utils/platform-contract-tests`)

**Adapters MAY:**
- Depend on `platform-sdk`
- Depend on framework-specific libraries (Fastify, Express, etc.)

**Adapters MUST NOT:**
- Depend on other adapters' internals
- Depend on feature modules
#- Export framework-specific types in public API

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
import { IPlatformModule } from '@prosto/platform-sdk';
import { ModuleLifecycleOrchestrator } from '@prosto/platform-core';

// ✅ Good: Relative imports within same package
import { UserService } from './services/user.service';

// ❌ Bad: Direct cross-package relative imports
import { IPlatformModule } from '../../platform-sdk/src/platform/interfaces';

```

### Import Organization

```typescript
// 1. Node.js built-in modules
import { EventEmitter } from 'node:events';

// 2. Third-party dependencies
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// 3. Platform SDK (contract package)
import {
  type IPlatformModule,
  type PlatformModuleLifecycleStageType,
} from '@prosto/platform-sdk';

// 4. Platform core (runtime)
import { InMemoryServiceRegistry } from '@prosto/platform-core';

// 5. Same-package imports (relative)
import { User } from '../types/user.types';
import { UserService } from './services/user.service';
```

---

## Dependency Policy

### Allowed Dependencies Matrix

| Package | Can Depend On | Cannot Depend On |
|---------|---------------|------------------|
| `platform-sdk` | Minimal vetted external libs | Other PROSTO runtime packages |
| `platform-core` | `platform-sdk`, vetted runtime libs | Adapters implementations, feature modules |
| `platform-utils/platform-contract-tests` | `platform-sdk`, test framework | `platform-core`, adapters implementations |
| `platform-utils/platform-cli` | `platform-sdk` | `platform-core` runtime internals |
| `platform-adapter-*` | `platform-sdk`, framework libs | Other adapters internals, feature modules |
| `modules` | `platform-sdk`, approved third-party libs | `platform-core` internals, other modules internals |

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

---

## Workspace Configuration

### Directory Layout

- Adapter workspaces live in `packages/platform-adapters/platform-adapter-*/`.
- Modules live in separate repositories.
- Shared utility workspaces live under `packages/platform-utils/`; other platform workspaces remain direct children of `packages/`.
- Root workspace globs must include `packages/*`, `packages/*/*`, and `packages/*/*/*`.

### Turborepo Configuration

The project uses Turborepo for monorepo task orchestration.

**Pipeline Tasks** (defined in `turbo.json`):
- `build` - Builds publishable packages with Vite 8 and emits declarations via `vite-plugin-dts` (depends on `^build` for dependency order)
- `typecheck` - Type checking (depends on `^build`)
- `test` - Runs test suites (depends on `^build`)
- `test:contracts` - Runs workspaces that provide this task (depends on `^build`)
- `lint` / `lint:fix` / `format` / `format:fix` - Linting and formatting tasks
- `dev` - Development mode (no cache, persistent)

**Common Commands**:
```bash
npm run build                                 # Build all packages with dependency ordering
npm run test                                  # Run tests across workspaces
npm run typecheck                             # Type-check workspaces
npm run dev                                   # Start available workspace development tasks
npm run build --workspace=@prosto/platform-sdk # Build the SDK package
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

---

## Versioning Strategy

### SDK Contract Versioning (ADR-0002)

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking contract change | Major | Remove required lifecycle field |
| Backward-compatible extension | Minor | Add optional manifest field |
| Non-breaking fix | Patch | Correct type narrowing |

### Core Runtime Versioning

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking runtime behavior | Major | Lifecycle ordering contract change |
| Backward-compatible feature | Minor | New optional policy hook |
| Bug or performance fix | Patch | Fix memory leak |

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
