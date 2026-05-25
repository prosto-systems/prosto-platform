# @prosto/platform-core

Phase 05 runtime foundation package for deterministic module lifecycle orchestration.

## Implemented Scope (Phase 05)
- Bootstrap pipeline: `discover -> validate -> resolve -> lifecycle`
- Deterministic dependency ordering with cycle detection and missing dependency diagnostics
- Startup policy modes: `strict` and `best-effort`
- Critical module failure override (always abort startup)
- Structured startup and shutdown diagnostics payloads
- Reverse-order shutdown with bounded timeout handling

## Configuration System

Universal configuration system inspired by .NET `ConfigurationBuilder`, supporting hierarchical loading with override chains.

### Configuration Sources

Sources are added in priority order (last wins):

| Source | Method | Priority |
|--------|--------|----------|
| In-memory | `addInMemoryCollection()` | Lowest |
| JSON file | `addJsonFile(path)` | |
| Environment-specific JSON | `addJsonFile(path, { optional: true })` | |
| Environment variables | `addEnvironmentVariables({ prefix: 'PROSTO_' })` | |
| Command-line arguments | `addCommandLine(args)` | Highest |

### Usage

```typescript
import { ConfigurationBuilder, ConfigurationValidator } from '@/common/index.js';
import { platformConfigSchema } from '@/runtime/index.js';

const config = new ConfigurationBuilder(platformConfigSchema)
  .addJsonFile('./app_settings.json')
  .addJsonFile('./app_settings.production.json', { optional: true })
  .addEnvironmentVariables({ prefix: 'PROSTO_' })
  .addCommandLine(process.argv.slice(2))
  .build()

// or

const config = ConfigurationValidator.validate(
  new ConfigurationBuilder()
    .addJsonFile('./app_settings.json')
    .addJsonFile('./app_settings.production.json', { optional: true })
    .addEnvironmentVariables({ prefix: 'PROSTO_' })
    .addCommandLine(process.argv.slice(2))
    .build(),
  platformConfigSchema,
);

```

### Command-Line Argument Formats

```bash
--key=value                 # Explicit value
--key value                 # Space-separated value
--key                       # Boolean true
--nested:property=value     # Nested structure via colon separator
```

### Environment Variables

Format: `PREFIX_KEY__NESTED` (double underscore for nesting)

```bash
PROSTO_LOGGING__LEVEL=debug    # → { logging: { level: 'debug' } }
PROSTO_MODULES__CACHE_ENABLED=true  # → { modules: { cacheEnabled: true } }
```

### Configuration Files

- `app_settings.json` — Default configuration
- `app_settings.{environment}.json` — Environment-specific overrides
- Secret values are automatically redacted from validation error messages

### Runtime Integration

`RuntimeBuilder` automatically loads config chain during `build()`:

```typescript
const runtime = new RuntimeBuilder().build({
  configDir: './config',
  environment: 'production',
});
```

Modules access config via `IModuleContext`:

```typescript
const fullConfig = ctx.config;
const value = ctx.getConfigValue<string>('database.host');
```

## Configuration Access Policy

The platform enforces a **default deny** policy for module configuration access. Modules receive only their scoped configuration by default, with explicit capability grants required for broader access.

### Core Principles

- **Least Privilege**: Modules receive only the minimum configuration necessary
- **Explicit Grant**: Extended access requires declared capabilities in module manifest
- **Deterministic Enforcement**: Unified policy checks in runtime pipeline
- **Auditability**: All denials are logged without leaking secrets

### Security Classes

Each module declares a security class in its manifest:

| Class | Description | Access Level |
|-------|-------------|--------------|
| `trusted` | Core platform modules | Full access to allowed sections |
| `internal` | Internal team modules | Standard platform APIs |
| `third-party-reviewed` | External modules | Restricted, integrity-verified |

### Capability Model

Modules declare capabilities in their manifest to request configuration access:

```typescript
const manifest: IPlatformModuleManifest = {
  id: 'my-module',
  capabilities: [
    'lifecycle.register',
    'config.read.platform',    // Request platform section access
    'config.read.logging',       // Request logging section access
  ],
  // ...
};
```

### Error Codes

Policy violations produce structured diagnostics:

| Error Code | Meaning | Remediation |
|------------|---------|-------------|
| `CONFIG_ACCESS_DENIED` | Access outside permitted scope | Request additional capabilities |
| `CONFIG_CAPABILITY_INVALID` | Unknown or malformed capability | Use valid capability identifiers |
| `CONFIG_SECTION_NOT_ALLOWLISTED` | Section not allowed for security class | Elevate security class or update allowlist |
| `CONFIG_WILDCARD_FORBIDDEN` | Wildcard pattern used | Use explicit section paths |

### Runtime Policy Validation

```bash
npm run validate:runtime-policy
```

This command runs the full policy validation suite including config access checks.

### Secret Redaction

All logs and diagnostics automatically redact sensitive data:
- Passwords, tokens, secrets, API keys
- Connection strings, private keys
- Database URLs, JWT secrets

## Package Checks
- `npm run typecheck --workspace @prosto/platform-core`
- `npm run test --workspace @prosto/platform-core`
