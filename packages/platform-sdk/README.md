# @prosto/platform-sdk

`@prosto/platform-sdk` is the contract authority for Prosto Platform modules,
runtime adapters, and admin plugins. It provides the public TypeScript types,
Zod schemas, validators, service tokens, and small shared utilities that
integrations use without depending on platform-core or another module.

All public APIs are `@alpha` and may change in minor releases.

## Requirements

- Node.js >= 22.23.0
- npm >= 10

## Installation

Install the SDK in a module or adapter project:

```bash
npm install @prosto/platform-sdk
```

## Module Contracts

Use the modularity contracts to declare a module manifest and implement its
`init`, `start`, and `stop` lifecycle. Validate untrusted manifest input with
`PlatformModuleManifestValidator` before using it.

```ts
import {
  PlatformModuleManifestValidator,
  type IPlatformModule,
  type IPlatformModuleContext,
} from '@prosto/platform-sdk/platform';

export const manifest = new PlatformModuleManifestValidator().parse({
  id: 'example-module',
  version: '1.0.0',
  sdkVersion: '^0.0.0',
  title: 'Example module',
});

export class ExampleModule implements IPlatformModule {
  async init(context: IPlatformModuleContext): Promise<void> {
    context.logger.info('Initializing example module');
  }

  async start(context: IPlatformModuleContext): Promise<void> {
    context.logger.info('Starting example module');
  }

  async stop(context: IPlatformModuleContext): Promise<void> {
    context.logger.info('Stopping example module');
  }
}
```

The manifest schema requires an ID matching `[a-z][a-z0-9-]{2,}`, a semantic
version, an SDK version range, and a non-empty title. The validator also rejects
duplicate dependencies and groups, as well as self-dependencies.

`PlatformModuleCompatibilityValidator` validates the runtime SDK and optional
Node.js versions as semantic versions, then checks them against `sdkVersion` and
`nodeVersion` from the manifest. The core runs this compatibility check before
dependency resolution and module loading. `validate()` returns structured
issues; `assert()` throws `PlatformModuleCompatibilityValidationError` when the
module is incompatible.

## Admin Plugins

Admin entries export a named registration callback that receives the SDK's
`IAdminShellPluginContext`. Register translations, workspaces, menu items, and
blades through its services.

```ts
import type { IAdminShellPluginContext } from '@prosto/platform-sdk/admin';

export function registerAdminPlugin(context: IAdminShellPluginContext): void {
  context.translationService.registerLocaleMessages({
    en: { example: { title: 'Example' } },
    ru: { example: { title: 'Example' } },
  });

  context.workspaceService.addWorkspace('example.workspace', {
    url: '/example',
    title: 'example.title',
  });
}
```

Build admin plugin artifacts with
[`@prosto/platform-admin-vite`](../platform-utils/platform-admin-vite/README.md).
For the plugin manifest, registration lifecycle, and runtime restrictions, see
[`@prosto/platform-admin-shell`](../platform-admin-shell/README.md).

## HTTP Contracts

The SDK defines framework-neutral alpha HTTP contracts for required transport
adapters and modules. An `IHttpRuntimeAdapter` exposes the endpoint registrar;
the core makes `context.capabilities.http.endpoints` available only while a
module is executing `init()`. It is absent in later lifecycle phases. Endpoints
use `IHttpEndpoint`, receive immutable
`IHttpRequestContext`, and return the standard Web `Response`; they never
receive Fastify, Busboy, or Node stream types.

Endpoint paths are absolute and case-sensitive. They support literal segments,
`:parameters`, and at most one terminal `*`; trailing slashes remain distinct.
Request-derived values are untrusted. JSON and text are typed body variants;
raw and multipart data are handler-owned one-shot Web streams that must be
consumed or cancelled before the handler returns.

In the current core, module endpoint declarations commit after successful
`init()` and roll back on failed `init()` or `start()`. Adapter endpoint
declarations commit after successful adapter `start()`. These are registration
barriers, not listener activation; HTTP listening starts last.

The runtime-adapter contracts include typed probe response shapes and sanitized
transport errors, but do not provide an HTTP server. Use
[`@prosto/platform-adapter-fastify`](../platform-adapters/platform-adapter-fastify/README.md)
as one concrete Fastify-backed HTTP adapter.

`IHttpRequestContext` also carries the effective protocol, host, and client
address chosen by the host after its trusted-proxy policy. An optional
`IHttpRequestGate`, resolved using `HTTP_REQUEST_GATE_SERVICE_TOKEN`, can deny a
request before an endpoint consumes its body. Gates return only a stable status
and sanitized code.

## Runtime Adapter Contracts

Every runtime requires exactly one `IPlatformAdminAdapter`,
`IPersistenceRuntimeAdapter`, and `IHttpRuntimeAdapter`, each extending
`IPlatformRuntimeAdapter`. They declare contributions in `initialize()`, start
only after their prerequisite barrier, and stop in reverse dependency order.
The administration adapter has the fixed `platform-admin` component ID. Adapter
contexts receive only immutable `adapters.<adapterId>` configuration.
`initialize(context)` receives `IPlatformRuntimeAdapterInitializationContext`
with owner-scoped service registration/resolution and optional persistence and
HTTP registrars; the required-adapter core supplies all three. `start(context)`
and `stop(context)` receive their respective SDK contexts with a runtime
lifecycle view, not the contributions object. All three hooks return
`void | Promise<void>`. These adapter contracts
are `@alpha`; concrete implementations are chosen by application composition,
not by `platform-core`.

Adapter services are immediately visible when registered. Owner scoping permits
removing only the registering adapter's services; it does not defer publication.
The core rolls back descriptors, endpoints, and services on failed adapter
initialization, and endpoints/services on failed start or stop. Cleanup calls
`stop()` only for adapters that completed `initialize()`, including those whose
`start()` failed. See the [core README](../platform-core/README.md) for current
composition validation, rollback ordering, and reporting, and
[ADR-0001](../../docs/adr/0001-required-runtime-adapters.md) for the required
barriers. Contribution rollback does not clean up external resources acquired
before initialization fails; the adapter owns that cleanup.

## Persistence Contracts

`IPersistenceRuntimeAdapter.descriptors` owns descriptor collection. Modules
declare metadata through `context.capabilities.persistence.descriptors` during
`init()` while persistence state is `collecting`; `start()` and `stop()` expose
`ready` state without a descriptor registrar. Persistence starts between module
initialization and module start, and modules resolve its published services
through `context.services`. The persistence adapter owns sealing and processing
the collected descriptors. These contracts do not expose ORM-specific types.

## Administration Contracts

The `admin/http` surface contains strict Zod schemas and inferred DTO types for
credential authentication, password resets, sessions, dashboard data, platform
health and manifests, maintenance operations, accepted responses, and sanitized
administration errors. Use these contracts at the shell and administration API
boundary rather than duplicating DTO validation. Server adapters should import
these DTOs from `@prosto/platform-sdk/admin/http`, which avoids loading the
Vue-bearing `@prosto/platform-sdk/admin` aggregate entry.

`IPlatformRuntimeCatalog` exposes a sanitized immutable runtime snapshot.
`IAdminAssetCatalog` resolves only declared plugin assets to an
`IAdminAssetReader`, which opens one-shot Web streams with trusted metadata.
`IHostRestartCapability` requests only idempotent local graceful shutdown;
distributed restart coordination remains outside the host contract. Their typed
tokens are `PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN`,
`ADMIN_ASSET_CATALOG_SERVICE_TOKEN`, and `HOST_RESTART_CAPABILITY_SERVICE_TOKEN`.

## Public API

- **Modularity**: `IPlatformModule`, module lifecycle context and logger,
  manifest schemas, `PlatformModuleManifestValidator`, compatibility validation,
  and lifecycle and startup-policy constants.
- **Runtime adapters**: common lifecycle, identities, roles, diagnostics,
  immutable scoped configuration, and owner-scoped contribution contracts;
  `IPlatformAdminAdapter`, `IPersistenceRuntimeAdapter`, and
  `IHttpRuntimeAdapter`.
- **Persistence**: descriptor, initialization, and registry contracts;
  `PersistenceDescriptorRegistry`; and structured persistence errors.
- **Events and services**: event-bus and service-registry interfaces with typed
  token helpers and platform service-token constants.
- **HTTP**: endpoint, request-body, registrar, transport lifecycle, probe, and
  sanitized-error contracts, effective request metadata, request-gate contract,
  and HTTP registrar-provider/request-gate service tokens.
- **Administration**: strict admin HTTP DTO schemas, sanitized runtime and asset
  catalogs, and an idempotent local-restart host capability with typed tokens.
- **Security**: integrity verification and secret-redaction utilities.
- **Admin**: plugin manifest schemas and guards, registration-context interfaces,
  admin-shell constants and tokens, plus `useAdminShell()` and `useBladeScope()`.
- **Utilities**: semver, token, string, and object helpers.
- `SDK_CONTRACT_VERSION`: version of the installed SDK contract surface.

The package has no root (`@prosto/platform-sdk`) export. Use only published
subpaths: `@prosto/platform-sdk/platform` for runtime,
module, HTTP, persistence, and administration contracts;
`@prosto/platform-sdk/admin/http` for server-safe administration DTOs;
`@prosto/platform-sdk/admin` for admin-plugin UI contracts; and
`@prosto/platform-sdk/utils` for utilities. Other deep imports are not public
API.

## Scripts

Run these commands from the repository root:

| Command                                              | Purpose                                      |
| ---------------------------------------------------- | -------------------------------------------- |
| `npm run build --workspace=@prosto/platform-sdk`     | Build the ESM package and type declarations. |
| `npm run typecheck --workspace=@prosto/platform-sdk` | Type-check the package.                      |
| `npm run test --workspace=@prosto/platform-sdk`      | Run type and unit tests.                     |
