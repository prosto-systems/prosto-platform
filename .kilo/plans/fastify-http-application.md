# Fastify HTTP Application Plan

## Goal

Add an architecture-compliant HTTP application lifecycle that lets discovered
modules contribute endpoints during `init()`, activates only endpoints owned by
successfully started modules, starts Fastify after runtime startup, and closes
HTTP before module/runtime shutdown.

The design follows the useful split in Virto Commerce's `IModule.Initialize` /
`PostInitialize`: modules declare composition-time behavior first, while the
fully composed application becomes active later. It does not copy ASP.NET or
Fastify types into module APIs and does not add a new mandatory module lifecycle
method.

## Decisions

- Add `@alpha`, framework-neutral HTTP contracts to `@prosto/platform-sdk`.
- Add `@prosto/platform-adapter-fastify` under `packages/platform-adapters/`.
- Keep Fastify and all server implementation details out of `platform-core`.
- Let `FastifyHttpApplication` own `runtime.start() -> route activation ->
  listen()` and `stop accepting HTTP -> runtime.stop()`.
- Let modules register endpoint declarations only through
  `context.capabilities.http` during `init()`; it is absent in `start()` and
  `stop()` and when no HTTP host is composed.
- Use a framework-neutral readonly request context containing `method`, `url`,
  `headers`, `params`, `query`, a discriminated streaming-capable body, `signal`,
  and `correlationId`. Handlers return the standard Web `Response` supported by
  Fastify 5.
- Allow absolute module paths so modules can contribute namespaces such as
  `/api/admin/...`; reserve `/health`, `/health/`, `/ready`, and `/ready/` for
  the application (all methods).
- Reject invalid declarations and canonical route conflicts during module
  `init()`, roll back all declarations from the failing module, and let the
  existing strict/best-effort policy decide abort versus skip. Unexpected
  conflicts left for Fastify to detect remain fatal to HTTP startup.
- Collect all valid declarations, then seal/filter them by
  `runtime.startedModuleIds`. Contributions from modules that fail `init()` or
  `start()` never become reachable and do not conflict with active routes.
- Support parsed JSON/text, bounded raw request streams, and bounded streaming
  multipart parts without buffering files or writing temporary files.
- Support streamed responses, including SSE via `text/event-stream`; WebSocket
  upgrades and bidirectional connection contracts are out of scope.
- Require request/file streams to be consumed or cancelled before a handler
  returns. Streaming responses are supported, but duplex responses that keep
  reading an unfinished request stream are not.
- Apply validated host-wide transport, handler, upload, and graceful-shutdown
  timeouts; request handlers receive a signal combining client disconnect,
  handler timeout, and application shutdown.
- Include `GET /health` and `GET /ready`. Keep auth, authorization, middleware
  contribution APIs, CORS, TLS, rate limiting, static module assets, OpenAPI,
  and the production admin backend explicitly out of scope.
- Keep both probes always public and minimal; they never return configuration,
  failure messages, stack traces, paths, or secrets and are not affected by
  future module authentication middleware.

## Public Contract Shape

Add `packages/platform-sdk/src/platform/http/` with grouped `constants/`,
`interfaces/`, `tokens/`, and barrel exports, then export it from
`packages/platform-sdk/src/platform/index.ts`.

Define and document these `@alpha` APIs:

- `HTTP_METHODS` and `HttpMethodType` for `DELETE`, `GET`, `HEAD`, `OPTIONS`,
  `PATCH`, `POST`, and `PUT`.
- `IHttpRequestContext`: immutable request metadata, typed request body, abort
  signal, and request correlation ID. Use copied readonly string/string-array
  records for headers and query values (preserving repeated values), a copied
  readonly string record for params, and a request-local `URL`. Document every
  network-derived field as untrusted.
- `HttpRequestBodyType` as a discriminated union:
  `{ kind: 'none' }`, `{ kind: 'json'; value: unknown }`,
  `{ kind: 'text'; value: string }`,
  `{ kind: 'stream'; mediaType; stream: ReadableStream<Uint8Array> }`, or
  `{ kind: 'multipart'; parts: AsyncIterable<HttpMultipartPartType> }`.
- Multipart field/file interfaces. Fields expose untrusted name, media type,
  encoding, and string/parsed-JSON value. Files expose untrusted field name,
  filename, media type, encoding, and a one-shot Web `ReadableStream` that must
  be consumed or cancelled before advancing. Do not expose paths, buffers,
  Node streams, Busboy, or Fastify multipart types.
- Document all request streams as one-shot and handler-owned only until the
  handler returns; returning a response transfers cleanup back to the adapter.
- `HttpRequestBodyError` with `BODY_ALREADY_CONSUMED`, `PAYLOAD_TOO_LARGE`,
  `MULTIPART_FIELDS_LIMIT`, `MULTIPART_FILES_LIMIT`, and
  `MULTIPART_PARTS_LIMIT` codes so modules may deliberately map stream errors;
  uncaught instances are converted to sanitized 4xx responses.
- `HttpEndpointHandlerType`: synchronous or asynchronous function returning a
  Web `Response`.
- `IHttpEndpoint`: method, absolute path, and handler. Document the supported
  platform path grammar: literal segments, `:parameter` segments, and at most
  one terminal `*` segment. Keep matching case-sensitive and trailing slashes
  distinct. Disallow inline regex/optional parameters and other Fastify-only
  syntax so this contract can be implemented by another adapter.
- `IHttpEndpointRegistrar`: module-scoped `register(endpoint)` API with no
  caller-supplied owner ID.
- `IHttpEndpointRegistrarProvider`: host capability used by core to obtain a
  transactional registrar bound to the current module ID, commit its scope when
  `init()` succeeds, and roll back all owner contributions after a failed
  lifecycle phase. Define commit/rollback as synchronous and idempotent;
  rollback after commit is valid and must not throw.
- `IHttpModuleContext`: exposes only the scoped endpoint registrar.
- `HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN`: stable SDK service token.
- `ServiceRegistryConfiguratorType`: generic application-composition callback
  receiving `IServiceRegistry`. It is synchronous; core rejects a thenable
  result at runtime because TypeScript `void` callbacks can otherwise accept an
  `async` function.
- `IHttpApplicationRuntime`: narrow structural runtime dependency containing
  `started`, `degraded`, `stopped`, `startedModuleIds`, `start()`, and `stop()`;
  `PlatformRuntime` must satisfy it without the adapter importing core.
- `HTTP_APPLICATION_STATES`, `HttpApplicationStateType`, and
  `IHttpApplication`: observable single-use application state, bound URL when
  listening, and idempotent/concurrency-safe `start()` and `stop()` methods.
  States are `created`, `starting`, `listening`, `stopping`, `stopped`, and
  `failed`.
- `HttpEndpointRegistrationError` plus typed codes/details for invalid
  declaration, reserved path, canonical conflict, closed owner scope, and
  sealed-registry use: `HTTP_ENDPOINT_INVALID`, `HTTP_ENDPOINT_RESERVED_PATH`,
  `HTTP_ENDPOINT_CONFLICT`, `REGISTRATION_SCOPE_CLOSED`, and
  `HTTP_ENDPOINT_REGISTRY_SEALED`. This SDK error lets core report safe route
  failures without importing the adapter.
- Stable response shapes: health is `{ status: 'healthy', timestamp,
  uptimeSeconds }`; readiness is `{ status: 'ready' | 'not-ready', ready,
  degraded, startedModuleIds, reasons, timestamp }`. A started best-effort
  runtime returns HTTP 200 with `ready: true` and `degraded: true`; non-ready
  state returns 503 with typed reasons `application_not_listening`,
  `runtime_not_started`, and/or `application_stopping`.
- `IHttpErrorResponse` is the minimal sanitized transport envelope
  `{ code, correlationId }`; adapter-owned codes are `invalid_request`,
  `not_found`, `payload_too_large`, `unsupported_media_type`,
  `request_timeout`, and `internal_error`. This remains compatible with the
  admin shell client's
  optional `code`/`correlationId` parsing without claiming its domain API.

Extend `IPlatformModuleContext` with `capabilities.http?: IHttpModuleContext`
and document that it is present only during `init()` when an HTTP host capability
was composed. Modules that require HTTP may throw when it is absent; modules
with optional HTTP behavior may use optional chaining and remain headless.

## Implementation Steps

1. **Define SDK contracts and type coverage first.**
   - Add the HTTP contracts, constants, service token, nested barrels, and root
     export described above.
   - Add SDK runtime/type tests proving handler input/output and body narrowing,
     token typing, application/runtime structural compatibility, the optional
     module context capability, and HTTP error narrowing.
   - Keep SDK dependencies unchanged: Node 22 types already provide `URL`,
     `AbortSignal`, `ReadableStream`, and Web `Response`.

2. **Open generic host-service composition in core.**
   - Add optional `configureServices?: ServiceRegistryConfiguratorType` to
     `packages/platform-core/src/runtime/interfaces/runtime-builder-options.interface.ts`.
   - Invoke it exactly once in `RuntimeBuilder.build()` after creating the core
     registry and before creating `ModuleContextFactory` or returning the
     runtime. Propagate configuration errors synchronously and clear the
     partially built registry before rethrowing.
   - Inspect the callback result and reject thenables with a structured build
     `RuntimeServiceConfigurationError` carrying
     `ASYNC_SERVICE_CONFIGURATION_NOT_SUPPORTED`; asynchronous host registration
     is not supported because module contexts must see a complete registry
     before `build()` returns. Place/export the error through the runtime error
     barrel rather than directly under `src/`.
   - Do not add an HTTP provider, Fastify option, HTTP bootstrap stage, or
     framework-specific configuration to core.
   - Add focused core tests for callback ordering, registration visibility,
     duplicate-token/async-callback failure propagation, cleanup, and no
     callback behavior.
   - Fix the bootstrap readiness prerequisite: when the pipeline exits with
     `abort: true`, ensure the coordinator returns no loaded modules and at
     least one failure diagnostic. Add a platform-level `BOOTSTRAP_ABORTED`
     fallback diagnostic using the last failed stage outcome only when the
     aborting stage did not already add a more specific failure. This makes the
     startup report `failed` and `runtime.started === false` without coupling
     the HTTP adapter to core report types.
   - Test a missing discovery directory as failed/not-started and an existing
     empty discovery directory as a valid started runtime. Keep specific
     dependency, lifecycle, and persistence diagnostics authoritative rather
     than adding duplicate fallback failures.

3. **Expose a phase-scoped HTTP registrar to modules.**
   - In `ModuleContextFactory`, resolve
     `HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN` from the shared service
     registry only for lifecycle stage `init`.
    - If present, call the provider with the manifest module ID and attach the
      returned scoped registrar as `context.capabilities.http.endpoints`; never
      ask the module to submit an owner ID.
    - Leave `context.capabilities.http` undefined for `start`, `stop`, and headless
     compositions.
   - Resolve the same provider into `ModuleLifecycleOrchestrator`. If module
     `init()` succeeds, call `commit(moduleId)` before advancing. If module
     `init()` or `start()` fails, call `rollback(moduleId)` before continuing or
     evaluating startup policy. This prevents a failed module's declarations
     from blocking later modules or becoming active.
   - Treat `init()` plus HTTP-scope commit as one initialization transaction: a
     commit failure is reported as that module's init failure and triggers
     rollback before startup policy evaluation.
   - A committed/rolled-back registrar rejects further calls with
     `REGISTRATION_SCOPE_CLOSED`, even if a module retained the registrar and
     invokes it from `start()` or a timer. Registration is valid only before the
     module's `init()` promise resolves.
   - When the failure is `HttpEndpointRegistrationError`, retain its safe
     message/remediation in the lifecycle diagnostic and use a dedicated core
     `HTTP_ENDPOINT_REGISTRATION_FAILED` runtime code; keep generic lifecycle
     mapping for unknown module exceptions.
   - Add `ModuleContextFactory` tests proving owner scoping and stage
     restriction. Add orchestrator tests proving commit after successful init,
     rollback on init/start failure, rejection through a retained registrar,
     safe HTTP diagnostic mapping, and no commit/rollback call when no HTTP
     provider is composed. No HTTP-specific bootstrap stage belongs in core.

4. **Make contract-test contexts lifecycle-aware.**
   - Change the alpha
     `IModuleLifecycleContextFactory.create` contract in
     `packages/platform-utils/platform-contract-tests` to receive the current
     lifecycle stage.
   - Update `runLifecycleConformanceCheck` to create a context per phase rather
     than reuse one context for all phases.
   - Supply a no-op/recording HTTP registrar only for `init()` in the default
     factory. Add a conformance fixture that registers an endpoint and asserts
     HTTP capability is unavailable in `start()` and `stop()`.
   - Preserve the existing `init -> start -> stop` contract; do not add
     `httpInit` or `PostInitialize`.

5. **Create the publishable Fastify adapter package.**
   - Create
     `packages/platform-adapters/platform-adapter-fastify/` using the TypeORM
     adapter's package, Vite, Vitest, strict tsconfig, source grouping, and root
     barrel layout.
   - Runtime dependencies: `@prosto/platform-sdk`, `fastify@^5.12.1`,
     `@fastify/multipart@^10.1.1`, and `zod` for adapter-option validation.
     Public declarations must not expose Fastify, Busboy, or Node stream types.
   - Export `FastifyHttpApplication`, its framework-neutral options interface,
     and `FastifyHttpApplicationError` with typed invalid-configuration,
     service-composition, runtime-startup, route-activation, listen, and
     shutdown codes. Keep the endpoint registry and Fastify request mapping
     internal; error details contain only safe phase/state data and retain the
     original cause for the application owner.

6. **Implement endpoint collection and activation.**
   - Implement the internal registry with global states `collecting` and
     `sealed` plus per-owner `open`, `committed`, and `rolled-back` scopes. A
     registrar closes over its owner ID; commit closes registration while
     retaining routes, and rollback closes/removes all owner routes while global
     collection remains open.
   - Copy/freeze declarations on registration and validate method, callable
     handler, absolute path of at most 2048 characters, unique parameter names
     matching `[A-Za-z][A-Za-z0-9_]*`, allowed literal/parameter/terminal-
     wildcard segments, absence of query, hash, backslashes, empty/dot segments,
     and reserved health/readiness paths.
   - Define a literal segment as RFC 3986 unreserved characters, valid
     percent-encoded octets, sub-delimiters, and `@`, with `:` reserved for a
     whole parameter segment and `*` allowed only as the complete final segment.
   - Canonicalize parameter names when forming the conflict key so routes such
     as `GET /items/:id` and `GET /items/:slug` conflict. Keep trailing-slash
     behavior explicit, disable Fastify's implicit HEAD route creation, and
     treat HEAD as an independently declared method.
   - Reject duplicate canonical `method + path` during registration. The module
     encountered later in deterministic lifecycle order fails `init()`; rollback
     releases all of its earlier declarations. Never silently choose a route.
   - At activation, filter by the immutable set of successfully started module
     IDs, seal the collector, and register deterministic routes (module ID,
     path, then method ordering) with Fastify. Map any remaining Fastify route
     construction error to a fatal application-startup error.
   - Do not permit additions after sealing and do not support hot route
     replacement/unload in this slice.

7. **Implement `FastifyHttpApplication` lifecycle.**
   - Options accept a synchronous `runtimeFactory(configureHttpServices)` plus
     validated `host`, `port`, parsed/raw body limit, multipart limits,
     request/handler/keep-alive/shutdown timeouts, `trustProxy` (default false),
     and an optional SDK logger. Default host to `127.0.0.1`; allow port `0` for
     tests.
   - Default parsed JSON/text and raw stream limit to 1 MiB. Default multipart
     limits to 10 MiB per file, 10 files, 100 fields, 110 total parts, 64 KiB
     per field, 100 bytes per field name, 200 header pairs, and 110 MiB for the
     complete multipart request including framing. Limits are host-wide in this
     slice and may be changed only by validated composition options, not by
     module endpoint declarations.
   - Default `requestTimeoutMs` to 120 seconds, `handlerTimeoutMs` to 30 seconds,
     `keepAliveTimeoutMs` to 5 seconds, and HTTP `shutdownTimeoutMs` to 30
     seconds. Require positive safe integer timeout values no greater than
     Node's timer ceiling (`2_147_483_647` ms) at the application boundary.
   - The supplied configurator registers the adapter's registrar provider in
     the runtime service registry. Detect a runtime factory that ignores or
     invokes the configurator more than once and fail before runtime startup.
   - On `start()`: create the runtime once, start it, require
     `runtime.started === true`, select routes for `startedModuleIds`, register
     routes/system handlers, await Fastify readiness, then listen and publish
     the bound URL/state.
   - A degraded best-effort runtime may listen and reports ready with
     `degraded: true`; only successfully started module routes are active.
   - On any route/listen/startup failure: never expose a partially configured
     listener, close Fastify if necessary, call `runtime.stop()` to release core
     services, mark the app failed, and throw a structured error retaining the
     internal cause.
   - On `stop()`: make readiness false, abort the application shutdown signal,
     and call `fastify.close()` so no new handler can reach stopping modules.
     Wait up to the HTTP shutdown timeout, then force-close remaining Node
     connections. Always call `runtime.stop()` in `finally`; HTTP drain/force
     errors must not prevent runtime cleanup, and combined failure is reported
     safely.
   - Make concurrent/repeated start and stop calls deterministic; define the
     application as single-use after stop/failure because runtime providers are
     not restartable.
   - Cache in-flight lifecycle promises: concurrent `start()` callers await one
     startup, concurrent `stop()` callers await one shutdown, `start()` while
     listening is a no-op, and `start()` after stopping/stopped/failed rejects.
     `stop()` during startup waits for startup to settle and then performs normal
     cleanup; `stop()` before start or after complete cleanup is an idempotent
     transition/no-op.

8. **Map requests and secure default responses.**
   - Convert Fastify request fields into `IHttpRequestContext` without
     reconstructing a Web `Request`: clone and freeze headers/params/query
     records, combine Fastify's client/handler signal with the application
     shutdown signal, and build a request-local URL from request metadata only
     as untrusted data.
   - Preserve Fastify's parsed JSON/text values in their body variants. Register
     JSON parsing for `application/json` and `application/*+json`, and text
     parsing for `text/*`; malformed JSON is a sanitized 400. Treat other
     non-multipart media types, including form-urlencoded and binary content,
     as raw streams rather than guessing a domain representation. Register a
     broad regular-expression parser after specific parsers so DELETE bodies
     are covered as well as POST/PUT/PATCH. It exposes a one-shot Web stream and
     counts actual bytes (not only `Content-Length`), aborting with the typed
     payload-limit error when the host limit is crossed.
   - Reject a non-empty request body without `Content-Type` as sanitized 415;
     modules never receive a raw stream with an invented media type. Treat
     GET/HEAD as bodyless regardless of endpoint declarations.
   - Register `@fastify/multipart` in stream mode (`attachFieldsToBody: false`,
     no disk persistence, no `toBuffer`) and adapt `request.parts()` to a
     one-shot platform async iterable. Preserve serial part ordering and parsed
     JSON field values. A module must consume/cancel each file before requesting
     the next part.
   - Enforce total multipart bytes with a counting pre-parser stream as well as
     checking `Content-Length`; chunked transfer must not bypass the total cap.
   - Track consumption in the body wrapper. Before sending the module's
     response, drain bounded unread file/part data or cancel it on request abort
     or handler failure so Busboy/Fastify completion cannot hang. Surface limit
     failures as sanitized 413 responses and never leave partial files because
     the adapter never writes uploads to disk.
   - Reject/document unsupported duplex behavior: a streaming response may not
     continue consuming a request or multipart file after the handler returns.
   - Accept an inbound `x-correlation-id` only when it matches
     `[A-Za-z0-9._:-]{1,128}`; otherwise generate `crypto.randomUUID()`. Include
     it in handler context, response headers, and error responses.
   - Send returned Web `Response` through Fastify's native Response support,
     including status, headers, and streaming bodies.
   - If a response stream fails after headers are committed, terminate that
     response and log only safe route/correlation/error metadata; do not attempt
     to send a second JSON error envelope. Before commit, use the normal
     sanitized error response.
   - Keep Fastify/Pino logging disabled. If the host supplies an
     `IPlatformModuleLogger`, emit lifecycle and completion/failure events using
     only route template, method, status, duration, module ID, correlation ID,
     and error code. Never log URL query strings, parsed params, bodies, raw
     headers, cookies, authorization values, filenames, or multipart fields.
   - Install sanitized 404, parser/body-limit, timeout, and unhandled-error
     responses. Never expose stack traces or exception messages for 5xx
     responses.
   - Implement `GET /health` and `GET /ready` with the SDK response contracts.

9. **Move the current example to the reusable application.**
   - Replace direct Fastify construction in
     `examples/typeorm-shared-datasource/src/index.ts` with
     `FastifyHttpApplication`; its runtime factory composes `RuntimeBuilder`,
     `TypeOrmPersistenceProvider`, the platform descriptor, and the HTTP service
     configurator.
   - Replace the example's direct `fastify` dependency with
     `@prosto/platform-adapter-fastify`.
   - Update the example's prestart/build sequencing so the discovered module
     and both publishable adapters are built before `tsx` resolves their package
     exports; do not rely on stale workspace `dist/` artifacts.
   - Pass a redacting `ConsoleModuleLogger('http')` from core to demonstrate
     safe optional adapter logging; adapter library code remains silent when no
     SDK logger is supplied.
    - In the discovered `module-order` `init()`, require
      `context.capabilities.http` explicitly (so this API module fails according
      to startup policy in a headless host),
     keep persistence descriptor registration, and add `GET /api/orders`. The
     handler resolves the ready TypeORM data source when a request arrives and
     returns `Response.json(...)`, demonstrating that declarations happen before
     persistence while requests run only after module start.
   - Keep signal ownership at the executable boundary with one-shot
     `SIGINT`/`SIGTERM` handlers that await `application.stop()`; library code
     must not install process handlers or call `process.exit()`.

10. **Remove the core/server boundary violation.**
    - Remove `fastify` from `packages/platform-core/package.json`, remove the
      package-local `start` script, and delete the unexported
      `packages/platform-core/src/main.ts` demo server.
    - Regenerate `package-lock.json` through npm so Fastify is owned by the new
      adapter and no longer by core.

11. **Document the public API and current architecture.**
    - Add the Fastify adapter README with lifecycle ordering, complete
      composition snippet, endpoint example, defaults, failure behavior,
      graceful shutdown, and security/non-goals.
    - Update root, SDK, core, contract-tests, and TypeORM example READMEs.
    - Update `AGENTS.md` and
      `.agents/rules/{architecture,monorepo,observability,security,testing}.md`
      to list the new package/commands, HTTP boundary/streaming rules and test
      strategy, and replace stale statements that no HTTP application exists,
      while retaining the rule that core owns no HTTP framework specifics.
    - Explicitly state that `/health` and `/ready` are infrastructure probes,
      not the admin shell's `/api/admin/platform/health`, and that production
      admin/auth/static-asset APIs remain unimplemented.

## Compatibility And Migration

- No manifest or persisted-data migration is required. Modules must migrate HTTP
  access from `context.http` to `context.capabilities.http`.
- HTTP-capable modules use the optional HTTP capability. A module whose API is
  mandatory must fail `init()` explicitly when `context.capabilities.http` is
  absent so the existing module `optional`/startup-policy semantics remain
  authoritative.
- The lifecycle-aware context-factory argument is an alpha breaking change only
  for custom `@prosto/platform-contract-tests` factories; update its README with
  the required stage parameter and migration example.
- The unexported core demo and package-local core `start` script are removed
  rather than retained as compatibility shims. Deployable/example applications
  migrate direct Fastify setup to `FastifyHttpApplication`; no root command is
  removed.
- Keep all new public SDK/adapter APIs `@alpha`; no compatibility aliases or
  deprecated Fastify-in-core path are introduced.

## Failure Scenarios To Test

- Invalid host/port/body, multipart, or timeout configuration fails before
  runtime startup.
- Runtime factory omits or duplicates HTTP service configuration.
- Strict runtime startup resolves with `started === false`: no listener is
  opened and runtime cleanup still runs.
- A missing discovery directory produces a failed runtime and no listener; an
  existing empty directory is allowed and can serve platform health/readiness.
- Best-effort runtime starts degraded: failed module endpoints are absent while
  healthy module endpoints and readiness remain available.
- A module registers malformed or reserved endpoints during `init()`.
- Two modules declare canonically equivalent routes: the later module fails
  `init()`, its contributions roll back, and startup policy controls abort/skip.
- Fastify reports an unexpected route conflict after registry validation:
  application startup fails and runtime stops.
- A module registers and then fails `init()` or `start()`: its declaration is
  discarded and cannot conflict with active routes.
- Registration is attempted after collector sealing.
- A module retains its registrar and calls it after `init()` resolves: the owner
  scope is closed and no route is added.
- Handler returns JSON, custom status/headers, empty body, and streaming
  `Response`; params/query/body/cancellation reach the neutral context.
- A response stream failing before/after header commit follows the documented
  sanitized-error versus terminate-and-log behavior.
- Parsed JSON/text variants are correct; an arbitrary media type is exposed as
  a one-shot raw stream; chunked raw input exceeding 1 MiB fails even without a
  `Content-Length` header.
- Non-empty body without `Content-Type` returns sanitized 415, and GET/HEAD never
  expose a request body to modules.
- Multipart fields and multiple file streams preserve order/metadata and apply
  all configured per-part and total limits (including chunked input); unread
  streams are drained/cancelled and do not hang response completion or create
  temporary files.
- A handler that leaves request data unread still completes through adapter
  drain; tests/documentation do not promise duplex request-to-response piping.
- Handler throws, malformed body is submitted, request exceeds body limit, and
  route is missing: responses are sanitized and include correlation IDs.
- A JavaScript module returning a non-`Response` value receives a sanitized 500;
  adapter code does not trust TypeScript declarations at the dynamic boundary.
- Caller-supplied valid/invalid correlation IDs are propagated/replaced.
- Repeated/concurrent `start()` and `stop()` calls do not double-start/listen,
  and HTTP closes before runtime stop.
- HTTP close failure does not prevent runtime cleanup.
- Handler/request timeouts abort the request context; shutdown drains compliant
  handlers, force-closes non-compliant streams at 30 seconds, and only then
  stops modules and persistence.

## Validation

Run focused checks first, then repository-wide gates:

```bash
npm run build --workspace=@prosto/platform-sdk
npm run test --workspace=@prosto/platform-sdk
npm run test --workspace=@prosto/platform-contract-tests
npm run test --workspace=@prosto/platform-core
npm run test --workspace=@prosto/platform-adapter-fastify
npm run typecheck --workspace=@prosto/platform-adapter-fastify
npm run build --workspace=@prosto/platform-adapter-fastify
npm run typecheck --workspace=@examples/typeorm-shared-datasource
npm run build --workspace=@examples/typeorm-shared-datasource
npm run lint
npm run format
npm run typecheck
npm run test
npm run test:contracts
npm run build
```

Manual smoke test the existing example's available `start` script and verify:

- `GET /health` returns 200 and liveness JSON.
- `GET /ready` returns 200 with the started `module-order` ID.
- `GET /api/orders` returns JSON from the initialized shared TypeORM data source.
- `SIGINT`/`SIGTERM` stops accepting requests before TypeORM is disposed.

## Explicit Non-Goals

- Authentication, authorization, sessions, CSRF, endpoint-level permissions.
- Module-provided middleware/hooks or direct Fastify plugin access.
- CORS, TLS termination, rate limiting, static/admin artifact serving, CSP.
- OpenAPI/schema generation and automatic domain validation; modules must use
  Zod on JSON/text/multipart field values, params, query, and relevant headers
  at their boundary and validate file metadata/content as they stream it.
- Hot module load/unload, route replacement, or restarting a stopped app.
- Duplex handlers whose response body continues reading an unfinished request
  or multipart stream after the handler returns.
- WebSocket upgrades and connection lifecycle management; SSE uses the normal
  streaming Web `Response` contract.
- Implementing the admin shell's mocked production backend contract.
