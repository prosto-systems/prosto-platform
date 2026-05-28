# AI Programming Agents Guidelines

## Project Overview

**prosto-platform** is a headless platform, expandable with plug-in modules and written in TypeScript. This document provides comprehensive guidelines for AI programming assistants working on this project.

## ⚠️ Current Project Status

**IMPORTANT**: Phase 01 through Phase 04 are fully implemented. Phase 05 (core runtime foundation) is partially implemented — the runtime lifecycle, deterministic orchestration, startup policy evaluation, and diagnostics baseline are complete. Phase 06 (security and performance hardening) is the **active implementation window**.

### Current Tooling Availability
- Phase 01 governance workflows are active under `.github/workflows/`:
  - `policy-gates.yml`
  - `quality-gates.yml`
  - `release-readiness.yml`
- Phase 02 workspace baseline is present under `packages/`:
  - `@prosto/platform-sdk`
  - `@prosto/platform-core`
  - `@prosto/platform-contract-tests`
  - `@prosto/platform-cli`
  - `@prosto/platform-adapter-http`
- Root/package TypeScript baselines are present:
  - `packages/platform-utils/tsconfig/base.json`
  - `packages/*/tsconfig.json`
- Package JavaScript build baseline uses Vite 8 (`vite.config.ts`) with `vite-plugin-dts` declaration generation for publishable packages.
- Governance and architecture policy scripts are present in root `package.json`:
  - `lint`
  - `lint:fix`
  - `lint:architecture`
  - `validate:dependency-policy`
  - `validate:module-graph`
  - `validate:public-api-boundary`
  - `validate:runtime-policy` (Phase 05 — validates manifests, security classes, startup policies)
  - `test:contracts` (Phase 04 — contract conformance suite)
  - `test:lifecycle-determinism` (Phase 05 — deterministic lifecycle integration tests)
  - `release:evidence`
- `lint:architecture`, `validate:dependency-policy`, `validate:module-graph`, and `validate:public-api-boundary` are implemented and enforce Phase 02 boundary checks.
- `@prosto/platform-sdk` now includes Phase 03 contract surface, manifest validation, typed token helpers, and package-level tests.
- `@prosto/platform-sdk` test runner baseline uses Vitest (`packages/platform-sdk/vitest.config.ts` and package `test` scripts).
- `@prosto/platform-contract-tests` now includes the Phase 04 reusable conformance suite, failure taxonomy, and machine-readable conformance report output.
- Phase 05 implementation status:
  - ✅ **Implemented**: Core runtime foundation (`ModuleLifecycleOrchestrator`, `StartupPolicyEvaluator`, `PlatformRuntime`, `RuntimeBuilder`)
  - ✅ **Implemented**: Lifecycle determinism integration tests (`tests/integration/determinism.test.ts`)
  - ✅ **Implemented**: Runtime policy validation integration tests (`tests/integration/runtime-policy-validation.test.ts`)
  - ✅ **Implemented**: Diagnostics reports schema validation (`diagnostics-reports.schema.ts`, `diagnostics.reporter.ts`)
  - ✅ **Implemented**: Bootstrap pipeline with strict/best-effort modes (`bootstrap/`)
  - ✅ **Implemented**: Module modularity subsystem (`modularity/` — consolidated):
    - `modularity/context/` — Module context factory and interfaces
    - `modularity/graph/` — Dependency graph construction, cycle detection, topological sorter
    - `modularity/lifecycle/` — Module lifecycle orchestrator (register → init → start → stop with timeout)
    - `modularity/loader/` — Module loader with integrity checks and source plugins
    - `modularity/policy/` — Startup policy evaluator with strict and best-effort strategies + config access policy
    - `modularity/validation/` — Module validation strategies
  - ✅ **Implemented**: Event bus infrastructure (`events/`)
  - ✅ **Implemented**: Service registry (`services/`)
- ESLint baseline config exists at `eslint.config.mjs`; repository-wide standardized test stack is still phased.

### Architecture Documents Reference
Documents in `.context/` describe **target state**, not current code:
- `.context/01-research/` - Research and analysis
- `.context/02-architecture-design/` - Target architecture (C4, DFD, ADRs)
- `.context/03-work-plan/` - Work plan and recommendations
- `.context/04-implementation-plan/` - 10-phase implementation roadmap with Admin Enablement stream

## Project Context

This is a TypeScript-based headless platform following modern development practices with a focus on maintainability, testability, and performance. The project uses a micro-core architecture with expansion through plug-in modules.

## Code Style Guidelines

### TypeScript Configuration
- Use strict TypeScript configuration
- Enable all strict type checking options
- Configure proper module resolution
- Set up path mapping for cleaner imports

### Naming Conventions
- **Classes/Interfaces**: PascalCase (`UserService`, `IDataRepository`)
- **Variables/Functions**: camelCase (`getUserData`, `isValid`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`, `API_ENDPOINT`)
- **Files**: kebab-case with suffix (`user-profile.service.ts`, `user-data.manager.ts`)
- **Private members**: prefix with underscore (`_privateMethod`)

### Import/Export Strategy
```typescript
// ✅ Good: Organized imports with ESM (.js extensions for relative paths)
import { UserService } from './services/user.service.js';
import { Database } from './database.js';
import { Logger } from './utils/logger.js';
import type { IModuleContext } from '@prosto/platform-sdk';

// Barrel exports for clean module interfaces
export * from './services.js';
export * from './utils.js';
export * from './types.js';

// ✅ Good: Named imports for better tree-shaking
import { ServiceRegistry } from '@prosto/platform-core';
```

**Important**: The project uses ESM (`"type": "module"` in root `package.json`). Use `.js` file extensions in relative imports even though writing TypeScript.

### Type Definitions
```typescript
// ✅ Good: Explicit type annotations for public APIs
interface IUser {
  id: string;
  name: string;
  email: string;
}

// ✅ Good: Generic types for reusable components
class Repository<T> {
  async findById(id: string): Promise<T | null> {
    // implementation
  }
}

// ✅ Good: Union types over any
type StatusType = 'pending' | 'completed' | 'failed';
```

## Architecture Guidelines

### Contract-First Development

**ALWAYS implement in this order:**

1. **Define types in `platform-sdk`** BEFORE implementing in `platform-core`
2. **Define manifest schema** BEFORE implementing module loader
3. **Define lifecycle interfaces** BEFORE implementing orchestrator
4. **Test contracts** BEFORE implementing features

#### Module Development Example

```typescript
// ✅ Step 1: Implement module with manifest
export class HealthModule implements IPlatformModule {
  readonly manifest: IPlatformModuleManifest = {
    id: 'module-health',
    version: '1.0.0',
    sdkVersion: '^0.1.0',
    criticality: 'normal',
    securityClass: 'internal',
    capabilities: ['lifecycle.register', 'feature.health', 'obs.metrics'],
    dependencies: [],
    checksum: 'sha256:...', // Computed artifact checksum
  };
  
  register(ctx: IModuleContext): void { /* ... */ }
  init(ctx: IModuleContext): void { /* ... */ }
  start(ctx: IModuleContext): void { /* ... */ }
  stop(ctx: IModuleContext): void { /* ... */ }
}

// ✅ Step 2: Test via contract conformance
import { createModuleContractTests } from '@prosto/platform-contract-tests';

describe('HealthModule contract', () => {
  createModuleContractTests(
    { module: new HealthModule() },
    { describe, it }, // Pass Vitest helpers
  );
});
```

#### Module Manifest Structure

Every module manifest MUST include:
- `id`: Unique module identifier (kebab-case)
- `version`: Semantic version (MAJOR.MINOR.PATCH)
- `sdkVersion`: Compatible platform-sdk version
- `criticality`: Impact on platform startup ('critical' | 'normal' | 'optional')
- `securityClass`: Trust classification (see Security section)
- `capabilities`: Array of feature namespaces provided
- `dependencies`: Array of required module IDs
- `checksum`: SHA-256 integrity checksum

#### Stability Levels

All public exports in `@prosto/platform-sdk` MUST include stability annotation:

```typescript
/**
 * @stable
 * Module interface - stable since v0.1.0, backward compatible
 */
export interface IPlatformModule {
  readonly manifest: IPlatformModuleManifest;
  register(ctx: IModuleContext): Promise<void>;
  init(ctx: IModuleContext): Promise<void>;
  start(ctx: IModuleContext): Promise<void>;
  stop(ctx: IModuleContext): Promise<void>;
}

/**
 * @beta
 * Extended lifecycle hooks - may evolve in minor releases with migration path
 */
export interface IExtendedLifecycleHooks {
  onBeforeInit?: (ctx: IModuleContext) => Promise<void>;
  onAfterStart?: (ctx: IModuleContext) => Promise<void>;
}

/**
 * @experimental
 * Worker isolation API - no compatibility guarantee, subject to change
 */
export interface IWorkerIsolation {
  isolate(fn: () => void): Promise<void>;
}

/**
 * @internal
 * Internal utility - not public API, can change without notice
 */
export function _internalHelper(): void {
  // ...
}
```

**Stability Level Definitions:**

| Level | Meaning | Consumers | Backward Compatible |
|-------|---------|-----------|-------|
| `@stable` | Default public contract | All modules and adapters | ✅ Yes (semver minor/patch) |
| `@beta` | Candidate public contract | Early adopters, opt-in | ⚠️ May evolve with migration notes |
| `@alpha` | Early public contract | Early adopters, opt-in | ⚠️ May evolve in minor releases |
| `@experimental` | Exploration surface | Internal use only | ❌ No guarantee |
| `@internal` | Not public API | Package maintainers only | ❌ Can change anytime |

### OOP, Clean Architecture, and SOLID Baseline
- Apply object-oriented design for production code where it improves clarity, extension safety, and testability.
- Follow Clean Architecture boundaries so business policies are isolated from infrastructure and framework details.
- Follow SOLID principles for all new implementation and refactoring decisions.
- Prefer dependency inversion and explicit interfaces for cross-layer and cross-package collaboration.

### Modular Design Principles
- **Single Responsibility**: Each module should have one reason to change
- **Loose Coupling**: Minimize dependencies between modules
- **High Cohesion**: Related functionality should be grouped together
- **Dependency Injection**: Use DI for better testability and flexibility
- **Interface Segregation**: Define small, focused interfaces
- **Extensibility**: Design APIs with future expansion in mind

### Micro-core Architecture
- Maintain a minimal platform core with expansion through plug-in modules
- Use clear module boundaries and interfaces
- Ensure modules are independently testable and deployable
- Document module APIs and dependencies
- Follow consistent naming conventions across modules

### Error Handling Strategy
```typescript
// ✅ Good: Custom error classes
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Good: Proper error handling
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

## Security Best Practices

### Module Security Classification

**Every module MUST declare security class in manifest:**

```typescript
type TSecurityClass = 
  | 'trusted'               // Core platform modules, full access, signed artifacts
  | 'internal'              // Internal team modules, standard platform APIs
  | 'third-party-reviewed'; // External modules, reviewed and integrity-verified
```

Module classification determines:
- Load restrictions (dev/staging/production)
- Available platform APIs
- Sandboxing level
- Integrity verification requirements

#### Allowlist-Only Loading (Production)

```typescript
// ✅ Required for production: Allowlist configuration
const moduleAllowlist = [
  {
    id: 'prosto-module-health',
    version: '^1.0.0',
    checksum: 'sha256:abc123...',
    securityClass: 'internal'
  },
  {
    id: 'prosto-module-auth',
    version: '^1.2.0', 
    checksum: 'sha256:def456...',
    securityClass: 'trusted'
  }
];

// Reject any module not in allowlist for production
if (process.env.NODE_ENV === 'production' && !isInAllowlist(moduleId)) {
  throw new SecurityError('Module not in production allowlist', { moduleId });
}
```

### Input Validation
- Always validate external inputs
- Use type guards for runtime type checking
- Implement proper sanitization for user data
- Use parameterized queries to prevent SQL injection
- Validate all configuration inputs

### Authentication & Authorization
- Implement proper authentication flows
- Use role-based access control (RBAC)
- Secure sensitive data with encryption
- Implement proper session management

### OWASP Guidelines
- Follow OWASP security practices
- Implement proper logging for security events without exposing sensitive data
- Use HTTPS for all communications
- Keep dependencies updated and scan for vulnerabilities
- Sanitize user input to prevent injection attacks

## Performance Optimization

### Critical Path Optimization
- Identify and optimize performance bottlenecks
- Use appropriate data structures for specific use cases
- Implement caching for expensive operations
- Minimize object creation in hot paths

### Memory Management
- Monitor memory usage for long-running operations
- Implement proper cleanup for resources
- Use streaming for large data processing
- Avoid memory leaks in event handlers

### Algorithm Selection
- Choose appropriate algorithms based on data size
- Use memoization for expensive calculations
- Implement pagination for large datasets
- Consider lazy loading for non-critical features

## Testing Strategy

### Test Pyramid
```
    E2E Tests (Few, Slow)
   Integration Tests (Some, Medium)
  Unit Tests (Many, Fast)
```

### Test Runner: Vitest

The project uses **Vitest** for TypeScript testing. Test configuration files:
- Root: None (Turbo-orchestrated)
- Per-package: `packages/*/vitest.config.ts`
- Examples: `examples/*/vitest.config.ts`

**Common Commands:**
```bash
turbo test                                    # Run all tests across packages
turbo test --filter=@prosto/platform-sdk      # Run tests in specific package
turbo test:unit                               # Run unit tests only
turbo test:contracts                          # Run contract conformance tests
```

### Unit Testing with Vitest

```typescript
import { describe, it, beforeEach, expect } from 'vitest';

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: Partial<UserRepository>;
  
  beforeEach(() => {
    mockRepository = {
      findById: async () => ({ id: '123', name: 'John' }),
    };
    userService = new UserService(mockRepository as UserRepository);
  });
  
  describe('getUser', () => {
    it('should return user when found', async () => {
      const result = await userService.getUser('123');
      expect(result).toEqual({ id: '123', name: 'John' });
    });
  });
});
```

### Module Contract Testing

The platform provides reusable contract tests for module conformance. Reference modules in `examples/` demonstrate the pattern:

```typescript
// examples/module-health/tests/contracts.test.ts
import { describe, it } from 'vitest';
import { createModuleContractTests } from '@prosto/platform-contract-tests';
import { HealthModule } from '../src/index.js';

describe('HealthModule contract', () => {
  // createModuleContractTests validates:
  // - Manifest schema (id, version, capabilities, security class)
  // - Lifecycle phases (register → init → start → stop)
  // - Integrity checksum presence
  // - Dependency resolution
  createModuleContractTests(
    { module: new HealthModule() },
    { describe, it }, // Pass Vitest test helpers
  );
});
```

**All modules MUST pass contract tests before integration:**
```bash
turbo test:contracts
```

### Integration Testing
- Test module interactions
- Use real dependencies when possible
- Test database operations
- Validate API contracts

### Test Data Management
- Use factories for generating test data
- Implement proper test data cleanup
- Use realistic but anonymized data
- Avoid hardcoded test values

## Development Workflow

### Git Workflow
- Run Git commands only on request
- Use feature branches for new development with descriptive names
- Create meaningful commit messages following conventional commit format
- Review code through pull requests with at least one approval
- Ensure all tests pass before merging to main branch
- Use semantic versioning for releases

### Commit Messages
```
feat: add user authentication module

- Implement JWT-based authentication
- Add user registration endpoint
- Include password validation
- Add unit tests for auth service

Closes #123
```

### Pull Request Guidelines
- Create focused PRs with clear descriptions
- Include relevant tests and documentation
- Ensure all tests pass before merging
- Address review feedback promptly

## Code Quality

### Linting and Formatting
- Use ESLint for consistent code style
- Enable all TypeScript strict mode options
- Use Prettier for code formatting
- Configure proper module resolution
- Set up path mapping for cleaner imports

### Error Handling
- Implement proper error handling with custom error classes
- Add meaningful comments for complex logic
- Use proper abstraction layers
- Follow SOLID principles
- Avoid circular dependencies

### Documentation
- Document all public APIs with JSDoc comments
- Maintain README files for each module
- Document architectural decisions and patterns
- Keep API documentation up to date
- Include examples for complex functionality

## Development Environment

### Required Tools
- Node.js >= 22.12 (see `package.json` engines)
- npm >= 8
- TypeScript compiler (dependency)
- Vite 8 and `vite-plugin-dts` for publishable package builds
- Git for version control
- Turborepo (for monorepo task orchestration)

### IDE Configuration
- Enable TypeScript strict mode from `packages/platform-utils/tsconfig/base.json` and package-level `tsconfig.json`.
- Configure code formatting rules (Prettier - pending future phase).
- Use ESLint baseline config from `eslint.config.mjs`.
- Use TypeScript path mapping when introduced in a future monorepo phase.

### Turborepo Configuration
The project uses Turborepo for monorepo task orchestration. Key configurations:

**Pipeline Tasks** (defined in `turbo.json`):
- `build` - Builds publishable packages with Vite 8 and emits declarations via `vite-plugin-dts` (depends on `^build` for dependency order)
- `typecheck` - Type checking (depends on `^build`)
- `test` - Runs test suites (depends on `^build`)
- `test:types`, `test:unit`, `test:contracts` - Specific test types
- `lint` / `lint:fix` - ESLint checks (runs in parallel)
- `dev` - Development mode (no cache, persistent)

**Common Commands**:
```bash
turbo build          # Build all packages with dependency ordering
turbo test           # Run tests across all packages
turbo typecheck      # Type check all packages
turbo dev            # Start dev mode in all packages
turbo build --filter=@prosto/platform-sdk  # Build specific package
```

**Caching**:
- Turborepo caches build outputs in `.turbo/` directory
- Cache is gitignored but can be pushed to remote for CI/CD
- Use `--force` flag to bypass cache when needed

### Architecture & Dependency Validation

The project enforces architectural boundaries through policy validation scripts. Run these before committing:

**Package Boundary Checks:**
```bash
npm run lint:architecture       # Verify module import rules (ADR-0001)
npm run validate:dependency-policy  # Enforce dependency layering
npm run validate:module-graph   # Check module dependency tree
npm run validate:public-api-boundary # Verify SDK public API contracts
npm run validate:runtime-policy # Check runtime module loading policies
```

**What gets checked:**
- `lint:architecture`: Module imports don't violate boundaries (platform-core → adapters is forbidden)
- `validate:dependency-policy`: Strict dependency layering (no circular deps, correct directions)
- `validate:module-graph`: Module interdependencies form a valid DAG
- `validate:public-api-boundary`: SDK public exports match API_REPORT.md
- `validate:runtime-policy`: Module manifests, security classes, and startup policies

**These checks are enforced in CI** via `.github/workflows/` gates and must pass before merge.

### Development Workflow (Target State)

**Completed Baseline**:
1. Phase 01 governance activation (CI workflows, required checks, release evidence flow)
2. Phase 02 monorepo workspace and package boundary setup
3. Phase 03 SDK contract baseline and manifest validation
4. Phase 04 contract conformance test package and reference module validation
5. Phase 05 core runtime foundation (partially — lifecycle, policy, bootstrap, diagnostics, loader, graph, events, services)
6. ESLint + TypeScript baseline configuration

**Phase 05 Implemented Subsystems**:
- `bootstrap/` — Bootstrap coordinator, pipeline, and stage definitions (strict + best-effort modes)
- `common/` — Shared utilities, error types, assertion helpers
- `diagnostics/` — Operational reports schema validation and reporter
- `events/` — In-memory event bus infrastructure
- `logging/` — Module-scoped logger
- `modularity/` — Module modularity subsystem (consolidated):
  - `modularity/context/` — Module context factory and interfaces
  - `modularity/graph/` — Dependency graph construction, cycle detection, topological sorter
  - `modularity/lifecycle/` — Module lifecycle orchestrator (register → init → start → stop with timeout)
  - `modularity/loader/` — Module loader with integrity checks and source plugins
  - `modularity/policy/` — Startup policy evaluator with strict and best-effort strategies + config access policy
  - `modularity/validation/` — Module validation strategies
- `runtime/` — Platform runtime and builder
- `services/` — Service registry

**Phase 05 Remaining Work** (moved to Phase 06 scope):
- Allowlist-based production module loading enforcement
- Additional integrity verification hardening
- Secret redaction from diagnostics/logs

**Current Priority (Phase 06)**:
1. Implement security controls for runtime and CI:
   - Allowlist-only module loading in production
   - Integrity checksum verification enforcement
   - Secret redaction from logs and diagnostics
2. Implement performance regression gates:
   - Startup time benchmarks
   - Memory consumption baselines
   - CI performance regression detection
3. Extend `validate:runtime-policy` with security and performance checks

**Phase 07-09 (Admin Enablement Stream)**:
1. Implement `platform-admin-contracts`
2. Implement `platform-adapter-admin-bff`
3. Integrate separate `admin-shell` with UI plugins via contracts

**Phase 10 (Validation Gate)**:
1. Run internal MVP validation with runtime and admin plugin scenarios
2. Review KPI/SLO evidence and produce go or no-go outcome

## ⚠️ Critical Rules for AI Agents

### Rule Precedence and Conflict Resolution
When guidance conflicts, use this precedence order:
1. **Repository reality (source of truth)**: concrete files and scripts in repo (for example `package.json`, existing directories, real configs).
2. **`AGENTS.md`**: operational policy for all agents in this repository.
3. **`.kilocode/rules/*.md`**: mode-specific enforcement rules.
4. **`.cursor/rules/*.md` and `.clinerules/*`**: supplemental guidance.
5. **Target-state architecture docs in `.context/`**: design intent and roadmap, not proof of implemented runtime.

Conflict handling policy:
- If a higher-priority source contradicts a lower-priority one, follow the higher-priority source.
- If uncertain, explicitly label assumptions and reference concrete artifact evidence.

### Repository Readiness Truth Table
**BEFORE making recommendations about commands, tooling, or process maturity, verify these artifacts:**
1. `packages/platform-utils/tsconfig/base.json` and `packages/*/tsconfig.json`
2. `packages/`
3. `.github/workflows/`
4. test runner config (`vitest.config.*` / `jest.config.*`)
5. lint config (`eslint.config.*`)
6. formatting config (`prettier.config.*`)

Interpretation rules:
- If these artifacts are missing, the project is still **pre-baseline** for that capability.
- Do not infer implemented capability from architecture docs alone.
- Reference `.context/04-implementation-plan/` for planned rollout.

### Command and Capability Claim Policy
- Only list commands that are present in the current root `package.json` (or package-level `package.json` when monorepo exists).
- Do not claim `lint`, `test`, `single-test`, or CI commands unless scripts/configs exist in repository artifacts.
- For unavailable capabilities, state the gap and map it to the relevant phase in `.context/04-implementation-plan/`.

### Repository State Awareness
**BEFORE making any recommendations, verify:**
1. Check if `packages/platform-utils/tsconfig/base.json` and package-level `tsconfig.json` files exist
2. Check if `packages/` directory exists
3. Check if `.github/workflows/` exists
4. Check if test runner is configured

**If files are missing:**
1. State clearly that the repository baseline has regressed below completed Phase 01/02 expectations
2. Recommend restoring Phase 01/02 artifacts before feature implementation
3. Do NOT claim lint/test commands are available
4. Reference `.context/04-implementation-plan/` for roadmap

### Definition of Done for Phase Planning Recommendations
Every implementation recommendation should include:
1. **File-level target**: concrete file(s) to change/create.
2. **Evidence linkage**: why this step is needed, with artifact reference (`package.json`, `.context/*`, ADRs).
3. **Activation condition**: when a target-state rule becomes enforceable.
4. **Acceptance signal**: what artifact/output proves completion (script, config, workflow, check result).

### Architecture Boundary Rules
**DO NOT:**
- Import from `platform-core` into adapters (boundary violation)
- Import directly between modules (coupling violation)
- Add framework dependencies to core packages
- Ignore ADR constraints when proposing changes
- Add admin shell runtime, frontend framework, or UI rendering dependencies to `platform-core`
- Bypass admin integration contracts with direct module-to-shell coupling

**DO:**
- Design implementation with object-oriented composition and explicit abstractions
- Keep Clean Architecture dependency direction toward stable inner policies
- Enforce SOLID trade-offs explicitly during design and code review
- Reference ADRs when proposing architecture changes
- Validate dependencies against package boundaries
- Use contract-first approach (types before implementation)
- Follow micro-core boundary principles (ADR-0001)
- Keep admin integration in hybrid model: separate `admin-shell`, contract package, and BFF adapter

### Security-First Rules
**MANDATORY:**
- Validate all external inputs with Zod (when added)
- Use allowlist-only module loading in production
- Redact secrets from logs and diagnostics
- Classify modules by security level (trusted/internal/third-party)
- Never commit secrets or API keys

### Documentation Requirements
**ALWAYS:**
- Update AGENTS.md if adding new commands or tools
- Reference architecture docs from `.context/`
- Document public APIs with JSDoc comments
- Include stability level (@stable/@beta/@alpha/@experimental/@internal)

## Code Review Guidelines

### What to Look For
- Code follows established patterns and conventions
- Proper error handling is implemented
- Tests cover the new functionality
- Performance implications are considered
- Security best practices are followed
- TypeScript strict mode is enabled

### Review Process
- Review all changes in the pull request
- Test the functionality locally if possible
- Check for potential edge cases
- Ensure documentation is updated
- Verify that tests pass

## Troubleshooting

### Common Issues
- **TypeScript errors**: Check strict mode configuration
- **Import errors**: Verify module resolution settings
- **Test failures**: Check mocking setup and test isolation
- **Performance issues**: Profile critical paths and optimize

### Debugging Tips
- Use TypeScript's strict mode for better type safety
- Enable detailed logging for complex operations
- Use debugging tools to identify bottlenecks
- Check dependency versions for compatibility

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [OWASP Security Guidelines](https://owasp.org/)
- [Clean Code Principles](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

## Support

For questions about this project or AI agent guidelines:
- Check existing issues and documentation
- Create a new issue with detailed description
- Include relevant code snippets and error messages
- Provide steps to reproduce any issues

---

**Last Updated**: 2026-05-15
**Version**: 0.1.0
