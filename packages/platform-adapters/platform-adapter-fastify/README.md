# @prosto/platform-adapter-fastify

`@prosto/platform-adapter-fastify` is the alpha HTTP application host for
Prosto Platform. It owns Fastify and exposes only framework-neutral SDK
contracts to modules. Its public API does not expose Fastify, Busboy, or Node
stream types.

## Requirements

- Node.js >= 22.23.0
- npm >= 10
- `fastify` 5 is installed transitively by this package

## Composition and lifecycle

Create the application at the executable boundary. Its `runtimeFactory` must
build an `IHttpApplicationRuntime` and invoke the supplied service configurator
exactly once through `RuntimeBuilder.configureServices`.

```ts
import { FastifyHttpApplication } from '@prosto/platform-adapter-fastify';
import { RuntimeBuilder } from '@prosto/platform-core';

const application = new FastifyHttpApplication({
  host: '127.0.0.1',
  port: 3001,
  runtimeFactory: (configureHttpServices) =>
    new RuntimeBuilder().build({
      configDir: './config',
      configureServices: configureHttpServices,
    }),
});

await application.start();
console.info(application.url?.href);
```

`start()` creates the runtime, starts it, selects declarations owned by
successfully started modules, activates routes, and then begins listening.
`stop()` first stops accepting HTTP requests, aborts active handler contexts,
waits for Fastify to close (force-closing connections after the configured
timeout), and always stops the runtime afterwards. Repeated and concurrent
calls are deterministic. An application is single-use after it stops or fails.

The runtime factory must be synchronous. The adapter rejects a factory that
does not invoke the configurator exactly once before runtime startup; this
prevents modules from observing an incomplete service registry.

## Module endpoints

Modules declare framework-neutral endpoints only during `init()`.
`context.capabilities.http` is absent in `start()` and `stop()`, and is also
absent in a headless runtime. Modules whose API requires HTTP should fail
`init()` explicitly when it is not available.

```ts
import type { IPlatformModule, IPlatformModuleContext } from '@prosto/platform-sdk';

export class OrdersModule implements IPlatformModule {
  init(context: IPlatformModuleContext): void {
    if (!context.capabilities.http) {
      throw new Error('OrdersModule requires an HTTP host.');
    }

    context.capabilities.http.endpoints.register({
      method: 'GET',
      path: '/api/orders/:id',
      handler: async ({ params, correlationId }): Promise<Response> =>
        Response.json({ id: params.id, correlationId }),
    });
  }

  start(_context: IPlatformModuleContext): void {}
  stop(_context: IPlatformModuleContext): void {}
}
```

Paths are absolute and case-sensitive; trailing slashes remain distinct. The
platform grammar permits literal segments, `:parameter` segments, and at most
one terminal `*` segment. Fastify-specific syntax, inline regular expressions,
and optional parameters are not public contracts. `GET /health`,
`GET /health/`, `GET /ready`, and `GET /ready/` are reserved for the
application.

The collector commits declarations only after successful `init()` and removes
them when `init()` or `start()` fails. At activation it uses only
`runtime.startedModuleIds`, so endpoints from failed modules are unreachable.
Invalid or conflicting declarations fail module initialization through the
runtime's configured strict or best-effort startup policy. A remaining Fastify
route-activation conflict is fatal to application startup.

## Requests and responses

Handlers receive an immutable `IHttpRequestContext` and return the Web
platform's `Response`. Headers, params, query values, URL, body metadata, and
multipart metadata are untrusted and must be validated by the module.

- JSON and `application/*+json` bodies are parsed as `body.kind === 'json'`.
- `text/*` bodies are exposed as `body.kind === 'text'`.
- Other typed bodies are one-shot bounded Web streams.
- Multipart input is an ordered async iterable of fields and one-shot file
  streams; the adapter never writes uploaded files to disk.
- Request and file streams must be consumed or cancelled before the handler
  returns. Duplex request-to-response piping is unsupported.
- The handler signal aborts on client disconnect, handler timeout, or
  application shutdown.

Returned `Response` values support status, headers, regular bodies, streams,
and SSE (`text/event-stream`). The adapter accepts an `x-correlation-id` only
when it matches its safe grammar; otherwise it generates one. It puts the ID in
the handler context, module-handler response headers, and sanitized errors.

The adapter returns sanitized `{ code, correlationId }` envelopes for missing
routes, malformed input, limits, timeouts, and unexpected failures. It does not
return exception messages or stacks. Optional SDK logging contains only route
templates, methods, status, duration, module ID, correlation ID, and error
code; query strings, headers, bodies, filenames, and fields are not logged.

## Defaults

| Option | Default |
| --- | --- |
| `host` / `port` | `127.0.0.1` / `0` |
| Parsed JSON/text and raw stream limit | 1 MiB each |
| Multipart file / total request limit | 10 MiB / 110 MiB |
| Multipart files / fields / parts | 10 / 100 / 110 |
| Multipart field / name / header-pair limit | 64 KiB / 100 bytes / 200 |
| Request / handler timeout | 120 s / 30 s |
| Keep-alive / shutdown timeout | 5 s / 30 s |
| `trustProxy` | `false` |

All size and timeout options are validated at the application boundary. Timeout
values must be positive safe integers not larger than Node.js's timer ceiling.

## Probes and non-goals

`GET /health` is a minimal liveness probe with `healthy`, timestamp, and uptime.
`GET /ready` reports runtime readiness, degradation, successfully started module
IDs, and typed non-ready reasons. Both probes are public infrastructure routes;
they are not the admin shell endpoint `/api/admin/platform/health`.

Authentication, authorization, CORS, TLS, rate limiting, static assets, OpenAPI,
module middleware, WebSocket upgrades, and a production admin backend are not
implemented. In particular, production admin/auth/static-asset APIs remain out
of scope for this adapter.

## Scripts

Run from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run build --workspace=@prosto/platform-adapter-fastify` | Build package and declarations. |
| `npm run typecheck --workspace=@prosto/platform-adapter-fastify` | Type-check the adapter. |
| `npm run test --workspace=@prosto/platform-adapter-fastify` | Run the adapter tests. |
