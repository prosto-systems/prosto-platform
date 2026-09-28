# Security-First Development Rules

## Trust and Module Loading

**Implemented:** core discovers local module packages below
`platform.discoveryPath`, validates them through bootstrap, and loads their ESM
entry from `platform.probingPath` in-process. Discoverable packages need
`manifest.json`, `package.json`, and built `dist/` artifacts; prefer the `./platform`
package export. This is not a sandbox.

The SDK exports `IntegrityVerifier` from `@prosto/platform-sdk/platform` with
checksum and signature utilities. The core loading pipeline does not integrate
that verifier. URL/registry acquisition, archive verification, and enforced
artifact signatures or checksums are not implemented loading guarantees.

**Deployment requirements:** establish package provenance before startup; restrict
discovery-directory writes to trusted deployment tooling and probing-directory
rebuilds to the runtime identity. Treat loaded modules and admin plugins as trusted
code. Admin plugins are first-party ESM; their API boundary is not isolation.
Do not describe configuration access controls as a module-package allowlist.

## Validate Boundaries

**Development requirement:** validate external input with appropriate schemas at
HTTP handlers, configuration loading, manifests, and any new CLI, queue, or webhook
boundary. The latter are requirements when introduced, not claims that core ships
those transports. TypeScript types alone do not validate runtime data.

Use `PlatformModuleManifestSchema` or the SDK manifest validator from
`@prosto/platform-sdk/platform`; do not copy an abbreviated manifest interface or
replace semver validation with a simple regular expression. Schema validation is
not package integrity verification or authorization.

The Fastify adapter maps transport input into `IHttpRequestContext`. Modules own
domain validation and must explicitly map invalid input to safe responses. An
uncaught Zod error is not automatically a domain-level HTTP 400 response.

For example, a JSON-only handler can validate before processing:

```typescript
import type { IHttpRequestContext } from '@prosto/platform-sdk/platform';
import { z } from 'zod';

const LabelSchema = z
  .object({ label: z.string().trim().min(1).max(100) })
  .strict();

async function validateLabel(request: IHttpRequestContext): Promise<Response> {
  if (request.body.kind !== 'json') {
    if (request.body.kind === 'stream') {
      await request.body.stream.cancel();
    } else if (request.body.kind === 'multipart') {
      for await (const part of request.body.parts) {
        if (part.kind === 'file') await part.stream.cancel();
      }
    }
    return Response.json({ code: 'expected_json' }, { status: 415 });
  }

  const result = LabelSchema.safeParse(request.body.value);
  if (!result.success) {
    return Response.json({ code: 'invalid_label' }, { status: 400 });
  }

  return Response.json({ label: result.data.label });
}
```

`expected_json` and `invalid_label` above are example endpoint-owned codes, not SDK
error codes. Adapt schemas, responses, and authorization to the actual domain.

## Adapter Configuration

Core requires exactly one administration, persistence, and HTTP adapter and
validates composition before module discovery. Adapter configuration is immutable
and scoped to `adapters.<adapterId>`, not exposed through module contexts.
Adapters must validate their own options before contributing descriptors,
endpoints, or services.

`platform-admin` belongs to the required administration adapter. Discovered
modules cannot use that identity, and `modules.platform-admin` is not a supported
configuration alias. Core rejects that legacy location even when
`adapters.platform-admin` is present. Remove the legacy key. Follow
[ADR-0001](../../docs/adr/0001-required-runtime-adapters.md).

## HTTP Streams and Responses

- Treat headers, parameters, query values, URLs, bodies, multipart fields, filenames, and media types as untrusted.
- Raw and multipart file streams are one-shot and handler-owned only until return. Consume or cancel them before returning; finish or cancel each multipart file before advancing the iterator.
- Do not implement duplex request-to-response piping. Observe the request abort signal for disconnects, handler timeouts, and shutdown.
- The Fastify adapter bounds parsed, raw, and multipart input and does not persist uploads to disk. Modules own safe storage paths, content checks, and domain-specific limits.
- Adapter-generated transport errors contain a safe code and correlation ID, not exception messages or stacks. Endpoint-generated responses still need explicit sanitization.
- `/health` and `/ready` are public infrastructure probes, exempt from the administration request gate. Never put secrets or detailed failures into probe responses.

## Secrets and Logging

Use the supplied module or adapter logger with message-first calls. Core's
`ConsoleModuleLogger` applies `SecretsRedactor` to messages and context objects.
Module loggers use the configured redactor; adapter loggers currently use default
redaction settings. Redaction is pattern-based and is not a guarantee that
arbitrary sensitive content is safe to log.

```typescript
import type { IPlatformModuleContext } from '@prosto/platform-sdk/platform';

function logConfigurationLoaded(context: IPlatformModuleContext): void {
  context.logger.info('Module configuration loaded', {
    moduleId: context.moduleId,
  });
}
```

- Never log full configuration, credentials, tokens, request bodies, or raw exception objects. Prefer small, explicitly selected diagnostic fields.
- Keep secrets out of source control and query parameters. Use deployment-managed environment variables or secret stores, validate values, and rotate credentials.
- Pass adapter secrets only through the owning adapter's scoped configuration, not module contexts or diagnostics.
- Redact messages and structured data at any additional output boundary. Do not assume direct console calls or third-party loggers inherit core redaction.
- Avoid recursive or arbitrary object graphs in log context; the redactor is not a general-purpose safe serializer.

## Application Security Requirements

Authentication, authorization, rate limits, and audit records must be implemented
at the responsible application/adapter boundary. The administration adapter has
its own security behavior; arbitrary module endpoints do not acquire an auth
policy merely by using the HTTP adapter. Do not invent SDK `ForbiddenError`, a
global rate limiter, or a universal permission context.

Use parameterized persistence operations and context-appropriate output escaping.
Do not add an HTML sanitization dependency as a generic substitute for validation
or authorization. Security-relevant failures should produce safe operational or
audit records in the component that handles them; core does not promise a global
audit event taxonomy for integrity checks or package allowlist rejections.

Commit the dependency lockfile, use reproducible installation in CI, review new
dependencies and vulnerability findings, and keep framework dependencies out of
core. These are maintenance requirements, not evidence of an installed scanning
service or a particular CI vulnerability gate.

## Source References

- `packages/platform-sdk/src/platform/security/`: redactor and standalone integrity verifier.
- `packages/platform-sdk/src/platform/http/interfaces/http-request-context.interface.ts`: input and stream ownership contract.
- `packages/platform-core/src/runtime/`: composition and adapter configuration handling.
- `packages/platform-adapters/platform-adapter-fastify/src/`: transport mapping, limits, cancellation, error responses, and probes.
