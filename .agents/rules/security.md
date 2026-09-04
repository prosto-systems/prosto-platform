# Security-First Development Rules

## Module Loading Security

### Production Module Loading

**MANDATORY for production:**

1. **Manifest validation** - Schema validation against versioned contract
2. **Controlled discovery directory** - Only trusted deployment tooling may write module packages below `platform.discoveryPath`
3. **Controlled probing directory** - Only the runtime identity may rebuild `platform.probingPath`

The current core loader discovers local packages and executes their ESM entry
from the probing directory in-process. It is not a sandbox. URL/registry
acquisition, archive verification, checksums, and signatures are not
implemented, so production deployments must establish package provenance and
filesystem access controls before startup.

### Module Manifest Requirements

```typescript
interface IPlatformModuleManifest {
  id: string;
  version: string;
  sdkVersion: string;
  title: string;
  optional?: boolean;
  dependencies: Array<{
    id: string;
    version: string;
    optional?: boolean;
  }>;
}
```

---

## Input Validation

### Boundary Validation with Zod

**ALL external inputs MUST be validated:**

```typescript
import { z } from 'zod';

// HTTP request validation
const CreateModuleSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  config: z.record(z.unknown()).optional()
});

// Validate at boundary
function handleCreateModule(req: Request): Module {
  const validated = CreateModuleSchema.parse(req.body);
  // Now type-safe to use
  return moduleService.create(validated);
}
```

### Validation Points

**Validate at:**
- HTTP request boundaries (adapters)
- Queue message handlers
- CLI input parsing
- Webhook receivers
- Configuration loading
- Module manifest loading

### HTTP streaming boundary

`@prosto/platform-adapter-fastify` exposes framework-neutral request contexts.
All headers, parameters, query values, URLs, bodies, multipart fields, and file
metadata are untrusted. Modules must validate them at their boundary, including
file metadata and streamed content.

Raw request and multipart file streams are one-shot and handler-owned only
until the handler returns. Consume or cancel every stream before returning; do
not implement duplex request-to-response piping. The adapter bounds parsed,
raw, and multipart input, does not persist upload files to disk, and returns
sanitized transport errors with correlation IDs rather than exception details.

**Never trust:**
- Module-provided data without validation
- User input from any source
- Environment variables without schema validation
- Data from external systems

---

## Secret Management

### Secret Redaction

```typescript
// ✅ Good: redact strings and structured context before logging
import { SecretsRedactor } from '@prosto/platform-sdk';

const redactor = new SecretsRedactor();
const context = redactor.redactObject({ password, moduleId });
console.info(redactor.redact('Module configuration loaded'), context);

// ❌ Bad: Log sensitive data
console.info({ config }, 'Loading configuration'); // May expose secrets
```

### Environment Variables

```typescript
// Validate environment variables with schema
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  PORT: z.string().transform(Number)
});

const env = EnvSchema.parse(process.env);
```

### Secret Storage

**NEVER:**
- Commit secrets to version control
- Hardcode API keys in source code
- Log sensitive configuration values
- Pass secrets in query parameters

**ALWAYS:**
- Use environment variables or secret manager
- Redact secrets from logs and diagnostics
- Rotate secrets regularly
- Use separate secrets per environment

---

## Dependency Security

### Lockfile Discipline

```bash
# ALWAYS commit lockfile
git add package-lock.json

# NEVER bypass lockfile
npm ci  # Use in CI, not npm install
```

### Vulnerability Scanning

```bash
# Regular security audits
npm audit

# Fail CI on critical vulnerabilities
npm audit --audit-level=critical
```

### Minimal Dependency Footprint

**For `platform-sdk`:**
- Justify every dependency
- Prefer native Node.js APIs
- Consider if dependency can be in consumer packages

**For `platform-core`:**
- Keep framework-specific APIs out of the public core contract
- Vet all dependencies for security
- Track dependency licenses

---

## API Security

### Authentication & Authorization

```typescript
// Token-based access control
interface IAuthContext {
  userId: string;
  roles: string[];
  permissions: Set<string>;
}

// Check permissions before operation
async function deleteModule(moduleId: string, ctx: IAuthContext): Promise<void> {
  if (!ctx.permissions.has('module:delete')) {
    throw new ForbiddenError('Missing permission: module:delete');
  }
  
  await moduleRepository.delete(moduleId);
}
```

### Rate Limiting

```typescript
// Implement rate limiting for external APIs
const rateLimiter = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests'
};
```

### Input Sanitization

```typescript
// Sanitize user input to prevent injection
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: []
  });
}
```

---

## Security Error Handling

### Structured Security Errors

```typescript
class SecurityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

// Usage
throw new SecurityError(
  'Module integrity check failed',
  'MODULE_INTEGRITY_FAILURE',
  { moduleId, expectedChecksum, actualChecksum }
);
```

### Information Leakage Prevention

```typescript
// ❌ Bad: Expose internal details
catch (error) {
  res.status(500).json({
    error: error.message, // May expose sensitive info
    stack: error.stack
  });
}

// ✅ Good: Sanitized error response
catch (error) {
  logger.error({ error }, 'Module load failed');
  
  res.status(500).json({
    error: 'Internal server error',
    correlationId: generateCorrelationId()
  });
}
```

---

## Security Logging

### Audit Logging

```typescript
// Log security-relevant events
logger.info({
  event: 'MODULE_LOADED',
  moduleId: module.id,
  moduleVersion: module.version,
  optional: module.optional,
  timestamp: new Date().toISOString()
});

logger.warn({
  event: 'MODULE_LOAD_FAILED',
  moduleId: attemptedModuleId,
  reason: 'ALLOWLIST_REJECTED',
  timestamp: new Date().toISOString()
});
```

### Security Event Types

**MANDATORY to log:**
- Module load/unload events
- Authentication failures
- Authorization denials
- Integrity check failures
- Allowlist rejections
- Configuration validation failures

---
