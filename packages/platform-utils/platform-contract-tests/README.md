# @prosto/platform-contract-tests

Reusable alpha contract-conformance tests for Prosto platform modules. The
package validates a module manifest with the SDK validator and verifies that
the module lifecycle methods execute successfully.

## Requirements

- Node.js >= 22.23.0
- A module that implements `IPlatformModule` from `@prosto/platform-sdk/platform`
- A manifest that satisfies `IPlatformModuleManifest`

Install workspace dependencies from the repository root:

```bash
npm install
```

## Usage with Vitest

Add the package and Vitest to a module repository, then register the shared
checks in its contract test file:

```ts
import { describe, it } from 'vitest';
import { createPlatformModuleContractTests } from '@prosto/platform-contract-tests';
import { PlatformModule } from '../src/platform/platform.module.js';
import manifest from '../manifest.json' with { type: 'json' };

describe('Example module contract', () => {
  createPlatformModuleContractTests(
    { manifest, module: new PlatformModule() },
    { describe, it },
  );
});
```

The helper registers mandatory checks for:

- Manifest schema and semantic validation through `PlatformModuleManifestValidator`.
- The presence and successful execution of the `init`, `start`, and `stop` lifecycle methods.

Lifecycle methods run with a default test context: `environment` is `test`,
`config` is empty, `startupPolicy` is `best-effort`, logging is a no-op, and
`getConfigValue('contract.testing.enabled')` returns `true`. Supply a custom
`moduleLifecycleContextFactory` when the module requires different test
dependencies. The default context exposes a no-op HTTP endpoint registrar at
`context.capabilities.http.endpoints` only during `init`;
`context.capabilities.http` is undefined during `start` and `stop`.

These are two checks, not a full runtime integration suite. Each stage receives
a fresh default event bus and service registry, so registrations do not survive
between stages. Endpoint routing, persistence, adapter composition, and rollback
are not tested. Lifecycle execution stops at the first failure, without cleanup
of later stages. Provide a custom factory when a module needs shared test state.

## Lifecycle Context Factories

Custom lifecycle context factories receive the current lifecycle stage and must
create a context for that stage. This alpha signature requires the `stage`
argument; factories written before lifecycle-aware contexts must be updated.

```ts
import type { IModuleLifecycleContextFactory } from '@prosto/platform-contract-tests';
import type {
  IHttpEndpointRegistrar,
  IPlatformModuleContext,
} from '@prosto/platform-sdk/platform';

function createLifecycleContextFactory(
  baseContext: IPlatformModuleContext,
  endpointRegistrar: IHttpEndpointRegistrar,
): IModuleLifecycleContextFactory {
  return {
    create(manifest, stage) {
      return {
        ...baseContext,
        moduleId: manifest.id,
        sdkVersion: manifest.sdkVersion,
        capabilities: {
          ...baseContext.capabilities,
          http: stage === 'init' ? { endpoints: endpointRegistrar } : undefined,
        },
      };
    },
  };
}
```

Supply your own base test context and endpoint registrar, then pass the returned
factory as `moduleLifecycleContextFactory` in the input to either conformance
helper. This example deliberately shares the base context's services and event
bus across stages. The built-in default factory is internal and is not exported
from the package entry point.

## Programmatic Reports

Use `runModuleContractConformance` when CI or another tool needs a structured
result instead of registered test cases:

```ts
import {
  runModuleContractConformance,
  toConformanceReportJson,
} from '@prosto/platform-contract-tests';

const report = await runModuleContractConformance({
  manifest,
  module: new PlatformModule(),
});

const json = toConformanceReportJson(report);
```

The report contains the module identity, timestamp, individual checks, and a
summary. A mandatory failure sets `summary.result` to `fail`. Failure codes are
exported as `ContractFailureCodes` for CI consumers. The programmatic helper
returns failures in the report; it does not set a process exit code or write a
report file. CI integration must inspect `summary.result` itself.

All public APIs in this package are `@alpha` and may change in minor releases.

## Scripts

Run these commands from the repository root:

Direct workspace commands require built SDK dependencies. After `npm install`,
the root `npm run build` builds workspaces in dependency order.

| Command                                                         | Purpose                                      |
| --------------------------------------------------------------- | -------------------------------------------- |
| `npm run build --workspace=@prosto/platform-contract-tests`     | Build the ESM package and type declarations. |
| `npm run typecheck --workspace=@prosto/platform-contract-tests` | Type-check the package.                      |
| `npm run test --workspace=@prosto/platform-contract-tests`      | Run the package test suite once.             |
