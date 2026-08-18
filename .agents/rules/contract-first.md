# Contract-First Development Rules

## SDK Contract Priority

### Implementation Order

**ALWAYS implement in this order:**

1. **Define types in `platform-sdk`** BEFORE implementing in `platform-core`
2. **Define manifest schema** BEFORE implementing module loader
3. **Define lifecycle interfaces** BEFORE implementing orchestrator
4. **Define service tokens** BEFORE implementing service registry
5. **Define error types** BEFORE implementing error handling

### Example: Module Contract Development

```typescript
// ✅ Step 1: Define contract in platform-sdk
// packages/platform-sdk/src/platform/interfaces/platform-module-manifest.interfaces.ts
export interface IPlatformModuleManifest {
  id: string;
  version: string;
  sdkVersion: string;
  dependencies: string[];
}

// ✅ Step 2: Define platform module lifecycle interface
// packages/platform-sdk/src/platform/interfaces/platform-module.interface.ts
export interface IPlatformModule {
  // Lifecycle phases (in order)
  init(ctx: IPlatformModuleContext): Promise<void>;
  start(ctx: IPlatformModuleContext): Promise<void>;
  stop(ctx: IPlatformModuleContext): Promise<void>;
}

// ✅ Step 3: Define admin module lifecycle interface
// packages/platform-sdk/src/admin/interfaces/platform-admin-module.interface.ts
export interface IPlatformAdminModule {
  init(ctx: IPlatformAdminModuleContext): Promise<void>;
  mount(ctx: IPlatformAdminModuleContext): Promise<void>;
  unmount(ctx: IPlatformAdminModuleContext): Promise<void>;
}

// ✅ Step 4: Implement in platform-core using contracts
// packages/platform-core/src/modularity/lifecycle/module-lifecycle.orchestrator.ts
import { IPlatformModule, IPlatformModuleContext } from '@prosto/platform-sdk';

export class ModuleLifecycleOrchestrator {
  async executePhase(module: IPlatformModule, phase: LifecyclePhaseType, ctx: IPlatformModuleContext): Promise<void> {
    // Implementation uses contract types
  }
}
```

---

<!--

## Breaking Changes Policy

### When Breaking Changes Are Allowed

**Breaking changes to `platform-sdk` public API require:**

1. ✅ ADR reference documenting rationale
2. ✅ Compatibility statement (migration path)
3. ✅ Deprecation period (minimum 1 minor version)
4. ✅ Migration guide for module developers

### Breaking Change Examples

```typescript
// ❌ Breaking: Remove required field
interface IModuleManifest {
  // Removed: id: string;
}

// ✅ Non-breaking: Add optional field
interface IModuleManifest {
  id: string;
  description?: string; // New optional field
}

// ❌ Breaking: Change field type
interface IModuleManifest {
  id: number; // Was: string
}

// ✅ Non-breaking: Extend union type
type TCriticality = 'critical' | 'standard' | 'optional' | 'experimental'; // Added 'experimental'
```

### Deprecation Process

```typescript
// Step 1: Mark as deprecated (minor version)
/**
 * @deprecated Use `TServiceToken` instead. Will be removed in v1.0.0
 */
export type ServiceToken = string;

// Step 2: Provide migration path
export type TServiceToken = `${string}:${string}`;

// Step 3: Remove in next major version
```

--->

## Stability Levels

### Required Annotations

**ALL public exports MUST be marked with stability level:**

```typescript
/**
 * @stable
 * Platform module interface - stable since v0.1.0
 */
export interface IPlatformModule {
  // ...
}

/**
 * @beta
 * Extended lifecycle hooks - may evolve in minor releases
 */
export interface IExtendedLifecycleHooks {
  // ...
}

/**
 * @experimental
 * Worker isolation API - no compatibility guarantee
 */
export interface IWorkerIsolation {
  // ...
}

/**
 * @internal
 * Internal utility - not public API, can change without notice
 */
export function internalHelper(): void {
  // ...
}
```

### Stability Level Definitions

| Level | Meaning | Compatibility | Allowed Consumers |
|-------|---------|---------------|-------------------|
| `@stable` | Default public contract | Backward compatible within major version | All modules and adapters |
| `@beta` | Candidate public contract | May evolve in minor releases with migration notes | Early adopters by opt-in |
| `@alpha` | Early public contract | May evolve in minor releases with migration notes | Early adopters by opt-in |
| `@experimental` | Exploration surface | No compatibility guarantee | Internal use and controlled pilots |
| `@internal` | Not public API | Can change without notice | Package maintainers only |

### Labeling Rules

1. **Every export in `@prosto/platform-sdk`** must have stability level tag
2. **`platform-core` internals** are `@internal` unless explicitly promoted via SDK
3. **Beta and Experimental** contracts require sunset or promotion criteria in release notes

---

## Contract Testing

### Contract Test Structure

```typescript
// packages/platform-contract-tests/src/lifecycle/lifecycle.contract.ts
import {
  IPlatformAdminModule,
  IPlatformAdminModuleContext,
  IPlatformModule,
  IPlatformModuleContext,
  IPlatformModuleManifest,
} from '@prosto/platform-sdk';

export function createPlatformModuleLifecycleContractTests(
  manifest: IPlatformModuleManifest,
  module: IPlatformModule,
  runner: {
    describe(name: string, body: () => void): void;
    it(name: string, body: () => Promise<void> | void): void;
  }): void {
  runner.describe('Platform module Lifecycle Contract', () => {
    runner.it('should have valid manifest', () => {
      expect(manifest.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    runner.it('should execute phases in order', async () => {
      const ctx: IPlatformModuleContext = createMockContext();
      await module.init(ctx);
      await module.start(ctx);
      await module.stop(ctx);
    });
  });
}

export function createAdminModuleLifecycleContractTests(
  module: IPlatformAdminModule,
  runner: {
    describe(name: string, body: () => void): void;
    it(name: string, body: () => Promise<void> | void): void;
  }): void {
  runner.describe('Platform admin module Lifecycle Contract', () => {
    runner.it('should execute phases in order', async () => {
      const ctx: IPlatformAdminModuleContext = createMockContext();
      await module.init(ctx);
      await module.mount(ctx);
      await module.unmount(ctx);
    });
  });
}
```

### Module Contract Validation

```typescript
// Module repository test
import { describe, it } from 'vitest';
import { createPlatformModuleLifecycleContractTests } from '@prosto/platform-contract-tests';
import { IPlatformModuleManifest } from '@prosto/platform-sdk';
import manifest from '../manifest.json';
import { AdminModule } from '../../src/admin/admin.module';
import { PlatformModule } from '../../src/platform/platform.module';

describe('HealthModule Contract Compliance', () => {
  createPlatformModuleLifecycleContractTests(manifest, new PlatformModule(), { describe, it });
  createAdminModuleLifecycleContractTests(new AdminModule(), { describe, it });
});
```

---

## Type Safety Rules

### No `any` Type

```typescript
// ❌ Bad: Using any
function processModule(data: any): void {
  // ...
}

// ✅ Good: Using union types and type guards
type TModuleData = IPlatformModuleManifest | unknown;

function isValidManifest(data: unknown): data is IPlatformModuleManifest {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'version' in data
  );
}

function processModule(data: TModuleData): void {
  if (isValidManifest(data)) {
    // Type-safe access
  }
}
```

### Explicit Return Types

```typescript
// ❌ Bad: Implicit return type
async function loadModule(id: string) {
  return module;
}

// ✅ Good: Explicit return type
async function loadModule(id: string): Promise<IPlatformModuleManifest> {
  return module;
}
```

---

## Validation at Boundaries

### Runtime Validation with Zod

```typescript
// packages/platform-sdk/src/modularity/schemas/platform-module-manifest.schema.ts
import { z } from 'zod';

export const PlatformModuleManifestSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  sdkVersion: z.string(),
  dependencies: z.array(z.string()),
});

export type TPlatformModuleManifest = z.infer<typeof PlatformModuleManifestSchema>;

// Usage in module loader
function validateManifest(raw: unknown): TPlatformModuleManifest {
  return ModuleManifestSchema.parse(raw);
}
```

### Input Validation at Module Boundaries

```typescript
// ✅ Good: Validate external input
class ModuleLoader {
  async loadModule(config: unknown): Promise<void> {
    // Validate at boundary
    const manifest = validateManifest(config);
    
    // Now type-safe to use
    await this.initializeModule(manifest);
  }
}
```
