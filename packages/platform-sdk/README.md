# @prosto/platform-sdk

`@prosto/platform-sdk` is the contract authority for Prosto Platform modules,
persistence adapters, and admin plugins. It provides the public TypeScript
types, Zod schemas, validators, service tokens, and small shared utilities that
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
} from '@prosto/platform-sdk';

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
import type { IAdminShellPluginContext } from '@prosto/platform-sdk';

export function registerAdminPlugin(
  context: IAdminShellPluginContext,
): void {
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

The SDK defines framework-neutral alpha HTTP contracts for application hosts and
modules. An HTTP host adds optional `context.capabilities.http.endpoints` only
while a module is executing `init()`. It is absent in later lifecycle phases and
in headless hosts. Endpoints use `IHttpEndpoint`, receive immutable
`IHttpRequestContext`, and return the standard Web `Response`; they never
receive Fastify, Busboy, or Node stream types.

Endpoint paths are absolute and case-sensitive. They support literal segments,
`:parameters`, and at most one terminal `*`; trailing slashes remain distinct.
Request-derived values are untrusted. JSON and text are typed body variants;
raw and multipart data are handler-owned one-shot Web streams that must be
consumed or cancelled before the handler returns.

`IHttpApplication` and `IHttpApplicationRuntime` define a narrow lifecycle
boundary for hosts. The SDK contracts include stable probe response shapes and
sanitized transport errors, but do not provide an HTTP server. Use
[`@prosto/platform-adapter-fastify`](../platform-adapters/platform-adapter-fastify/README.md)
to compose a Fastify-backed application.

## Public API

- **Modularity**: `IPlatformModule`, module lifecycle context and logger,
  manifest schemas, `PlatformModuleManifestValidator`, compatibility validation,
  and lifecycle and startup-policy constants.
- **Persistence**: provider, descriptor, initialization, and registry contracts;
  `PersistenceDescriptorRegistry`; and structured persistence errors.
- **Events and services**: event-bus and service-registry interfaces with typed
  token helpers and platform service-token constants.
- **HTTP**: endpoint, request-body, registrar, host lifecycle, probe, and
  sanitized-error contracts, plus the HTTP registrar-provider service token.
- **Security**: integrity verification and secret-redaction utilities.
- **Admin**: plugin manifest schemas and guards, registration-context interfaces,
  admin-shell constants and tokens, plus `useAdminShell()` and `useBladeScope()`.
- **Utilities**: semver, token, string, and object helpers.
- `SDK_CONTRACT_VERSION`: version of the installed SDK contract surface.

Import all public APIs from the package root. Deep imports are not public API.

## Scripts

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run build --workspace=@prosto/platform-sdk` | Build the ESM package and type declarations. |
| `npm run typecheck --workspace=@prosto/platform-sdk` | Type-check the package. |
| `npm run test --workspace=@prosto/platform-sdk` | Run type and unit tests. |
