# Observability Rules

## Implemented Behavior

Core supplies `ConsoleModuleLogger` to module and runtime-adapter contexts. It
redacts messages and context through `SecretsRedactor`, then writes to the console
with a component prefix. Module loggers use the configured redactor; adapter
loggers currently use default redaction settings. It is not a Pino logger or a
JSON log pipeline.

Core produces startup and shutdown diagnostics; adapter records remain separate
from module records. The Fastify adapter implements infrastructure probes and
endpoint request logs. There is no built-in metrics exporter or distributed
tracing integration. Requirements below must not be read as additional shipped
capabilities.

## Logging Contract

Both module and runtime-adapter loggers expose `debug`, `info`, `warn`, and `error`
with `(message: string, context?: Record<string, unknown>)`. Object-first Pino
calls and object-only calls do not match these contracts.

```typescript
import type { IPlatformModuleContext } from '@prosto/platform-sdk/platform';

function logModuleStart(context: IPlatformModuleContext): void {
  context.logger.info('Module lifecycle phase starting', {
    moduleId: context.moduleId,
    phase: 'start',
  });
}
```

Use `error` for failures, `warn` for handled abnormal conditions, `info` for normal
operational milestones, and `debug` for safe diagnostic detail. Never log complete
configuration or raw request/exception objects. Redaction is pattern-based and
configurable for module loggers, not permission to emit secrets.

Include fields when the caller actually has them:

- `moduleId`: real feature-module identity; distinguish adapter component identity in diagnostics.
- `phase`: actual phase; module phases are `init`, `start`, `stop`, while adapters use `initialize`, `start`, `stop`.
- `correlationId`: use the request or operation identifier; module lifecycle context has no such property.
- `errorCode`: use the owning contract's code, not a new universal code list.
- `durationMs`: measured elapsed time, not an assumed logger-generated metric.

The console logger adds `[Module:<id>]` even when used for an adapter. It does not
automatically add timestamps, correlation IDs, phase fields, or structured error
serialization. Fastify endpoint completion logs include route, method, status,
duration, owner ID, and correlation ID; failure logs include a transport error code
without the original exception details.

## Runtime Reports

Use `IPlatformRuntime.reports.startup` and `.shutdown` from the core runtime API
rather than re-declaring report interfaces. Reports may be absent before their
operation completes.

- Startup reports contain status, policy mode, correlation ID, start/completion timestamps, degraded state, and loaded/skipped/failed module diagnostics.
- Shutdown reports contain correlation ID, start/completion timestamps, module stop order, and shutdown issues.
- Both carry adapter diagnostics via SDK `IPlatformRuntimeAdapterDiagnostics`; adapter records identify component, role, lifecycle stage, and outcome.
- Failure and shutdown diagnostic message/remediation fields are redacted by report builders. Reports are operational data, not public probe payloads or a guarantee that arbitrary supplied text contains no secrets.
- `platform-admin` is an adapter component, never a loaded module, readiness module ID, or module count. This separation follows [ADR-0001](../../docs/adr/0001-required-runtime-adapters.md).

Report interfaces live in `packages/platform-core/src/diagnostics/interfaces/`.
Adapters depend on SDK diagnostic contracts, not core imports.

## Error Contracts

There is no single SDK `IPlatformError` or universal error-code table covering
every subsystem. Use the actual exported error class or diagnostic type for the
boundary being handled. Core failure diagnostics have `moduleId`, `phase`,
`errorCode`, `message`, and `remediationHint`; their phases can include bootstrap
and runtime stages, not just module lifecycle stages.

Do not invent `MODULE_INTEGRITY_FAILED` or `LIFECYCLE_ORDER_VIOLATION` as platform
codes. A standalone SDK integrity-verifier result is not a core loader diagnostic.
Likewise, `register` is not a module lifecycle phase.

Fastify's adapter-generated HTTP errors use `IHttpErrorResponse` from
`@prosto/platform-sdk/platform`, for example `internal_error` or
`payload_too_large`, and expose a correlation ID instead of internal error detail.
Application endpoints own their domain error mapping and must return safe
responses; throwing an arbitrary error does not declare a new transport status.

## Health and Readiness

`GET /health` and `GET /ready` are always-public, minimal infrastructure probes,
not the administration API's `/api/admin/platform/health`.

- `/health` reports `healthy`, timestamp, and uptime seconds. It is not a dependency health scan.
- `/ready` returns 200 only when the HTTP application is listening and the runtime is started and not stopping; otherwise it returns 503 when reachable.
- Readiness includes `ready`, `degraded`, `startedModuleIds`, timestamp, and typed reasons: `application_not_listening`, `runtime_not_started`, or `application_stopping`.
- A degraded started runtime remains ready. Administration maintenance does not change infrastructure readiness; these probes are exempt from its request gate.
- Do not expose configuration, failure details, stacks, filesystem paths, or secrets in probes.

## Correlation and Timing

`IHttpRequestContext.correlationId` is assigned by the Fastify adapter. It accepts
a single `x-correlation-id` value matching `^[A-Za-z0-9._:-]{1,128}$`; otherwise it
generates a UUID. Endpoint responses and sanitized transport errors carry
`x-correlation-id`. Use the supplied ID for request logs instead of copying an
unvalidated header or manufacturing a module lifecycle context with extra fields.

Runtime report correlation IDs identify runtime operations, not automatically
propagated HTTP traces. There is no automatic cross-service trace propagation.

Implemented timing includes report timestamps and Fastify endpoint `durationMs`
logs. Per-phase histograms, module load counters, dependency-resolution metrics,
OpenTelemetry exporters, and a `/metrics` endpoint are not implemented platform
features. If adding them, define ownership, contracts, safe labels, tests, and an
export mechanism explicitly. Do not present illustrative collector classes as
current APIs or use unbounded request/module data as metric labels.

## Source References

- `packages/platform-sdk/src/platform/modularity/interfaces/platform-module-logger.interface.ts`: message-first logger API.
- `packages/platform-core/src/logging/module-logger/console/console-module-logger.ts`: console formatting and redaction.
- `packages/platform-core/src/diagnostics/`: reports and sanitization.
- `packages/platform-core/src/common/constants/runtime.ts`: core runtime codes and stages.
- `packages/platform-sdk/src/platform/http/interfaces/`: HTTP error and probe contracts.
- `packages/platform-adapters/platform-adapter-fastify/src/fastify-http-adapter.ts`: request logs, correlation validation, transport errors, and probes.
