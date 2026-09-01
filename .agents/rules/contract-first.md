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
// packages/platform-sdk/src/platform/modularity/interfaces/platform-module-manifest.interfaces.ts
export interface IPlatformModuleManifest {
  id: string;
  version: string;
  sdkVersion: string;
  title: string;
  dependencies: IPlatformModuleDependency[];
}

// ✅ Step 2: Define platform module lifecycle interface
// packages/platform-sdk/src/platform/modularity/interfaces/platform-module.interface.ts
export interface IPlatformModule {
  // Lifecycle phases (in order)
  init(ctx: IPlatformModuleContext): void | Promise<void>;
  start(ctx: IPlatformModuleContext): void | Promise<void>;
  stop(ctx: IPlatformModuleContext): void | Promise<void>;
}

// ✅ Step 3: Define the admin registration context
// packages/platform-sdk/src/admin/interfaces/admin-shell-plugin-context.interface.ts
export interface IAdminShellPluginContext {
  readonly moduleId: string;
  readonly authService: IAdminShellAuthService;
  readonly translationService: IAdminShellTranslationService;
}

// ✅ Step 4: Implement in platform-core using contracts
// packages/platform-core/src/modularity/lifecycle/module-lifecycle.orchestrator.ts
import type {
  IPlatformModule,
  IPlatformModuleContext,
  PlatformModuleLifecycleStageType,
} from '@prosto/platform-sdk';

export class ModuleLifecycleOrchestrator {
  async executePhase(
    module: IPlatformModule,
    phase: PlatformModuleLifecycleStageType,
    ctx: IPlatformModuleContext,
  ): Promise<void> {
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
// Module repository test
import {
  createPlatformModuleContractTests,
  runModuleContractConformance,
} from '@prosto/platform-contract-tests';
import { describe, it } from 'vitest';
import manifest from '../manifest.json';
import { PlatformModule } from '../src/platform/platform.module.js';

describe('HealthModule contract', () => {
  createPlatformModuleContractTests(
    { manifest, module: new PlatformModule() },
    { describe, it },
  );
});

const report = await runModuleContractConformance({
  manifest,
  module: new PlatformModule(),
});
```

### Module Contract Validation

```typescript
import { describe, it } from 'vitest';
import { createPlatformModuleContractTests } from '@prosto/platform-contract-tests';
import manifest from '../manifest.json';
import { PlatformModule } from '../src/platform/platform.module.js';

describe('HealthModule Contract Compliance', () => {
  createPlatformModuleContractTests(
    { manifest, module: new PlatformModule() },
    { describe, it },
  );
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
// packages/platform-sdk/src/platform/modularity/schemas/platform-module-manifest.schema.ts
import { z } from 'zod';

export const PlatformModuleManifestSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{2,}$/),
  version: z.string(),
  sdkVersion: z.string(),
  title: z.string().trim().min(1),
  dependencies: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]{2,}$/),
    version: z.string(),
    optional: z.boolean().optional(),
  })).default([]),
});

export type PlatformModuleManifestType = z.output<
  typeof PlatformModuleManifestSchema
>;

// Usage in module loader
function validateManifest(raw: unknown): PlatformModuleManifestType {
  return PlatformModuleManifestSchema.parse(raw);
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
