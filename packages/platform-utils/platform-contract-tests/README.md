# @prosto/platform-contract-tests

Reusable alpha contract-conformance tests for Prosto platform modules. The
package validates a module manifest with the SDK validator and verifies that
the module lifecycle methods execute successfully.

## Requirements

- Node.js >= 22.23.0
- A module that implements `IPlatformModule` from `@prosto/platform-sdk`
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
import manifest from '../manifest.json';

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
- Lifecycle-scoped capabilities: the default context provides a no-op HTTP
  endpoint registrar in `init()` only and withholds it from `start()` and `stop()`.

Lifecycle methods run with a default test context: `environment` is `test`,
`config` is empty, `startupPolicy` is `best-effort`, logging is a no-op, and
`getConfigValue('contract.testing.enabled')` returns `true`. Supply a custom
`moduleLifecycleContextFactory` when the module requires different test
dependencies. The default context exposes a no-op HTTP endpoint registrar only
during `init`; `http` is unavailable during `start` and `stop`.

## Lifecycle Context Factories

Custom lifecycle context factories receive the current lifecycle stage and must
create a context for that stage. This alpha signature requires the `stage`
argument; factories written before lifecycle-aware contexts must be updated.

```ts
const moduleLifecycleContextFactory = {
  create(manifest, stage) {
    const context = createTestContext(manifest);

    return stage === 'init'
      ? { ...context, http: { endpoints: endpointRegistrar } }
      : context;
  },
};
```

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
exported as `ContractFailureCodes` for CI consumers.

All public APIs in this package are `@alpha` and may change in minor releases.

## Scripts

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run build --workspace=@prosto/platform-contract-tests` | Build the ESM package and type declarations. |
| `npm run typecheck --workspace=@prosto/platform-contract-tests` | Type-check the package. |
| `npm run test --workspace=@prosto/platform-contract-tests` | Run the package test suite once. |
