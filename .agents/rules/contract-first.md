# Contract-First Development Rules

## Contract Authority

These are development requirements, not a claim that every existing export is
fully annotated or stable. Source files and package export maps define the current
API; architecture constraints include
[ADR-0001](../../docs/adr/0001-required-runtime-adapters.md).

1. Define or update SDK contracts, schemas, tokens, and errors before changing their implementations in core or adapters.
2. Keep framework-neutral contracts in the SDK. Core must not import concrete adapters, modules, or admin shell runtime code.
3. Update contract tests and affected consumers together. Do not introduce local copies of SDK interfaces or schemas to bypass a contract change.
4. Document compatibility impact and migration requirements for public changes. Do not assume adding a union member is non-breaking for exhaustive consumers.

## Public Imports

`@prosto/platform-sdk` has no root export. Use its declared entry points, not
package-internal source paths:

- `@prosto/platform-sdk/platform`: module lifecycle, manifests, services, events, runtime adapters, HTTP, persistence, administration, and security.
- `@prosto/platform-sdk/admin`: admin plugin and shell integration contracts.
- `@prosto/platform-sdk/admin/http`: shared admin HTTP contracts.
- `@prosto/platform-sdk/utils`: public shared utilities.

Check `packages/platform-sdk/package.json` and the corresponding `src/` barrels
before naming an export. Runtime reports belong to `platform-core`, not the SDK;
adapters must not import core just to consume diagnostics.

## Lifecycle Contracts

- `IPlatformModule` has `init`, `start`, and `stop`, returning `void | Promise<void>`. There is no module `register` lifecycle phase.
- `IPlatformModuleContext` supplies module identity, configuration, logging, services, events, and lifecycle-scoped capabilities. It has no `correlationId` property.
- Persistence descriptor and HTTP endpoint registration capabilities are available during module `init`, not as a separate lifecycle hook.
- Directly composed runtime adapters use `initialize`, `start`, and `stop` with stage-specific SDK contexts. Do not model them as discovered modules.
- `RuntimeBuilder` requires one administration, persistence, and HTTP adapter. `platform-admin` is reserved for the administration adapter, not a feature module.
- Admin plugin registration is a separate contract under `/admin`; use its actual context rather than a hand-written subset presented as the complete interface.

## Validation and Type Safety

Accept untrusted data as `unknown`; validate it before use. Do not use `any`,
assertions, or shallow property checks as substitutes for validation. A union
with `unknown` collapses to `unknown` and provides no extra safety. Give public
functions explicit return types.

Reuse the canonical schema instead of reproducing its shape:

```typescript
import {
  PlatformModuleManifestSchema,
  type PlatformModuleManifestOutputType,
} from '@prosto/platform-sdk/platform';

function parseManifest(raw: unknown): PlatformModuleManifestOutputType {
  return PlatformModuleManifestSchema.parse(raw);
}
```

The current manifest schema is strict, validates semantic versions and version
ranges, trims the required title, defaults dependencies to an empty array, and
supports optional metadata and incompatibilities. Use
`PlatformModuleManifestInputType` for schema input and
`PlatformModuleManifestOutputType` for parsed output. A successful parse does not
prove runtime compatibility, dependency graph validity, package provenance, or
acceptance of reserved identities. The SDK manifest and compatibility validators
and the core bootstrap pipeline perform additional checks.

For new application boundaries, define domain-specific Zod schemas rather than
weakening platform schemas. Generic configuration access is not runtime validation.

## Stability Annotations

Require JSDoc and an explicit stability tag on new or changed public APIs. Read the
actual declaration before describing an existing API as stable: current module
and manifest contracts are `@alpha`, not stable since an invented release.

- `@stable`: preserve compatibility within the major version.
- `@beta`: candidate API; document changes and migration guidance.
- `@alpha`: early API; document changes and migration guidance.
- `@experimental`: exploration with no compatibility guarantee.
- `@internal`: implementation detail, not a supported consumer API.

These tags communicate policy; they are not automatic compatibility enforcement.
Do not promote internals by importing deep paths or invent deprecation schedules
without a concrete release decision.

## Contract Tests

Modules must pass contract tests before integration. The existing example module
uses the public helper as follows:

```typescript
import { describe, it } from 'vitest';
import { createPlatformModuleContractTests } from '@prosto/platform-contract-tests';
import { PlatformModule } from '../src/platform/platform.module.js';
import manifest from '../manifest.json';

describe('Module contract', () => {
  createPlatformModuleContractTests(
    { manifest, module: new PlatformModule() },
    { describe, it },
  );
});
```

`runModuleContractConformance` is the machine-readable alternative. The helper
validates the manifest and executes `init`, `start`, and `stop` using a context
factory. It does not prove transport behavior, persistence integration, security,
or rollback correctness. Supply suitable test contexts when needed and add focused
integration tests. The helper's current test title mentions `register`, but its
implementation follows `PLATFORM_MODULE_LIFECYCLE_STAGES`; that title does not add
a lifecycle contract.

## Source References

- `packages/platform-sdk/src/platform/modularity/`: canonical interfaces, schemas, validators, and lifecycle constants.
- `packages/platform-sdk/src/platform/adapters/`: runtime adapter contracts.
- `packages/platform-utils/platform-contract-tests/src/`: conformance helpers, checks, and test context factories.
- `examples/module-test/tests/contracts.test.ts`: concrete helper usage.
