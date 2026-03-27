# Monorepo Rules

## Package Boundaries

### Core Boundary Rules (ADR-0001)

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

**`platform-sdk` MUST:**
- Keep external runtime dependencies minimal and justified
- Prefer TypeScript and platform-native APIs
- Only export contracts, types, interfaces, tokens, and validation primitives

**`platform-sdk` MUST NOT:**
- Depend on other platform runtime packages
- Own full contract conformance test suites (that's `platform-contract-tests`)

**Adapters MAY:**
- Depend on `platform-sdk`
- Depend on framework-specific libraries (Fastify, Express, etc.)

**Adapters MUST NOT:**
- Depend on other adapters' internals
- Depend on feature modules
- Export framework-specific types in public API

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
import { PlatformModule } from '@prosto/platform-sdk';
import { LifecycleOrchestrator } from '@prosto/platform-core';

// ✅ Good: Relative imports within same package
import { UserService } from './services/user.service';

// ❌ Bad: Direct cross-package relative imports
import { PlatformModule } from '../../platform-sdk/src/types';

// ❌ Bad: Module-to-module imports
import { AuthModule } from '@prosto/platform-module-auth';
```

### Import Organization

```typescript
// 1. Node.js built-in modules
import { EventEmitter } from 'node:events';

// 2. Third-party dependencies
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// 3. Platform SDK (contract package)
import { PlatformModule, LifecyclePhase } from '@prosto/platform-sdk';

// 4. Platform core (runtime)
import { ServiceRegistry } from '@prosto/platform-core';

// 5. Same-package imports (relative)
import { UserService } from './services/user.service';
import { User } from '../types/user.types';
```

---

## Dependency Policy

### Allowed Dependencies Matrix

| Package | Can Depend On | Cannot Depend On |
|---------|---------------|------------------|
| `platform-sdk` | Minimal vetted external libs | Other PROSTO runtime packages |
| `platform-core` | `platform-sdk`, vetted runtime libs | Adapters implementations, feature modules |
| `platform-contract-tests` | `platform-sdk`, test framework | `platform-core`, adapters implementations |
| `platform-cli` | `platform-sdk`, CLI libs | `platform-core` runtime internals |
| `platform-adapter-*` | `platform-sdk`, framework libs | Other adapters internals, feature modules |
| `modules` | `platform-sdk`, approved third-party libs | `platform-core` internals, other modules internals |

### Dependency Validation

```bash
# Validate dependency boundaries (Phase 01)
npm run validate:dependency-policy

# Check for circular dependencies
npm run lint:architecture

# Validate public API boundary
npm run validate:public-api-boundary
```

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

### Root package.json

```json
{
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "build:sdk": "npm run build --workspace=@prosto/platform-sdk",
    "build:core": "npm run build --workspace=@prosto/platform-core",
    "test": "npm run test --workspaces --if-present",
    "lint": "eslint packages/*/src/**/*.ts",
    "typecheck": "tsc --noEmit --project packages/*/tsconfig.json"
  }
}
```

### Package tsconfig.json

```json
{
  "extends": "../../tools/tsconfig/base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## Build Orchestration

### Build Dependency Graph

```
platform-sdk (base)
    ↓
platform-core (depends on sdk)
    ↓
platform-contract-tests (depends on sdk)
platform-adapter-* (depend on sdk, core)
    ↓
modules (depend on sdk, adapters)
```

### Build Order

1. `platform-sdk` - must build first (contract authority)
2. `platform-core` - depends on SDK
3. `platform-contract-tests` - depends on SDK
4. `platform-adapter-*` - depends on SDK and core
5. Example modules - depend on SDK and adapters

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

---

## Related Documents

- [ADR-0001 Micro-Core Kernel Boundary](../.context/02-architecture-design/adr/ADR-0001-micro-core-kernel-boundary.md)
- [ADR-0002 SDK Contract And Semver Governance](../.context/02-architecture-design/adr/ADR-0002-sdk-contract-and-semver-governance.md)
- [04 Package Structure Blueprint](../.context/02-architecture-design/04-package-structure-blueprint.md)
