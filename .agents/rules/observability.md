# Observability Rules

## Current implementation

`platform-core` provides `ConsoleModuleLogger` for module contexts. It redacts
messages and context with `SecretsRedactor` before writing to the console; Pino
is not a repository dependency. The core also produces structured startup and
shutdown diagnostics. The Fastify adapter, not the core, implements `GET
/health` and `GET /ready` from SDK probe contracts.

## Structured Logging

### Core module logger

Use the logger supplied by `IPlatformModuleContext`; do not bypass its redaction
by logging unredacted module configuration directly.

```typescript
import type { IPlatformModuleContext } from '@prosto/platform-sdk';

function logModuleStart(context: IPlatformModuleContext): void {
  context.logger.info('Module lifecycle phase starting', {
    phase: 'start',
  });
}
```

### Required Log Fields

Add these fields where the calling context has them. The console logger adds a
module prefix but does not synthesize all fields.

| Field | Type | Description |
|-------|------|-------------|
| `moduleId` | string | Module identifier |
| `phase` | string | Lifecycle phase (init/start/stop) |
| `correlationId` | string | Request/correlation ID for tracing |
| `errorCode` | string | Standardized error code (for errors) |

### Log Level Discipline

```typescript
// ERROR: Application cannot continue, requires immediate attention
logger.error({ err, moduleId }, 'Module failed to start');

// WARN: Unexpected but handled, may indicate future problem
logger.warn({ moduleId, version }, 'Module using deprecated API');

// INFO: Normal operational messages
logger.info({ moduleId, phase }, 'Module lifecycle phase completed');

// DEBUG: Detailed diagnostic information
logger.debug({ config, moduleId }, 'Module configuration loaded');
```

### Example: Lifecycle Logging

```typescript
class ModuleLifecycleOrchestrator {
  async executePhase(
    moduleEnvelope: PlatformModuleEnvelope,
    phase: PlatformModuleLifecycleStageType,
    ctx: IPlatformModuleContext
  ): Promise<void> {
    const start = Date.now();
    
    logger.info({
      moduleId: moduleEnvelope.id,
      phase,
      correlationId: ctx.correlationId
    }, 'Module lifecycle phase starting');

    try {
      if (!moduleEnvelope.moduleInstance) {
        throw new Error('Module instance not found');
      }

      await moduleEnvelope.moduleInstance[phase](ctx);
      
      logger.info({
        moduleId: moduleEnvelope.id,
        phase,
        duration: Date.now() - start,
        correlationId: ctx.correlationId
      }, 'Module lifecycle phase completed');
      
    } catch (error) {
      logger.error({
        err: error,
        moduleId: moduleEnvelope.id,
        phase,
        errorCode: 'LIFECYCLE_PHASE_FAILURE',
        correlationId: ctx.correlationId
      }, 'Module lifecycle phase failed');
      
      throw error;
    }
  }
}
```

---

## Startup Report

### Implemented startup diagnostics

`IPlatformRuntime.reports.startup` is an `IRuntimeStartupReport`:

```typescript
interface IRuntimeStartupReport {
  type: 'startup';
  status: RuntimeStartupStatus;
  policyMode: PlatformStartupPolicyType;
  correlationId: string;
  startedAt: string;
  completedAt: string;
  degraded: boolean;
  loadedModules: readonly IRuntimeLoadedModuleDiagnostic[];
  skippedModules: readonly IRuntimeSkippedModuleDiagnostic[];
  failedModules: readonly IRuntimeFailureDiagnostic[];
}
```

---

## Error Model

### Structured Error Codes

```typescript
const ErrorCodes = {
  // Module loading
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',
  MODULE_LOAD_FAILED: 'MODULE_LOAD_FAILED',
  MODULE_VALIDATION_FAILED: 'MODULE_VALIDATION_FAILED',
  MODULE_INTEGRITY_FAILED: 'MODULE_INTEGRITY_FAILED',
  
  // Lifecycle
  LIFECYCLE_PHASE_FAILED: 'LIFECYCLE_PHASE_FAILED',
  LIFECYCLE_TIMEOUT: 'LIFECYCLE_TIMEOUT',
  LIFECYCLE_ORDER_VIOLATION: 'LIFECYCLE_ORDER_VIOLATION',
  
  // Compatibility
  INCOMPATIBLE_VERSION: 'INCOMPATIBLE_VERSION',
  MISSING_DEPENDENCY: 'MISSING_DEPENDENCY',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
} as const;
```

### Error Mapping

```typescript
interface IPlatformError {
  code: string;
  message: string;
  moduleId?: string;
  phase?: PlatformModuleLifecycleStageType;
  remediationHint?: string;
  cause?: Error;
}

class ModuleLoadError extends Error implements IPlatformError {
  constructor(
    public readonly code: string,
    public readonly moduleId: string,
    public readonly phase?: PlatformModuleLifecycleStageType,
    public readonly remediationHint?: string,
    cause?: Error
  ) {
    super(`Module ${moduleId} failed during ${phase}: ${cause?.message}`);
    this.name = 'ModuleLoadError';
    this.cause = cause;
  }
}

// Usage
throw new ModuleLoadError(
  ErrorCodes.MODULE_INTEGRITY_FAILED,
  'prosto-module-health',
  'register',
  'Verify checksum matches published artifact'
);
```

---

## Health & Readiness

`/health` and `/ready` are always-public, minimal infrastructure probes. They
must not return configuration, failures, stacks, paths, or secrets, and are not
the admin shell's `/api/admin/platform/health`. A degraded started runtime is
ready with `degraded: true`; an application that is not listening, whose runtime
is not started, or is stopping returns typed non-ready reasons. The current
adapter has no metrics export.

---

## Trace Propagation

### Correlation ID

```typescript
// Generate correlation ID for each request
function generateCorrelationId(): string {
  return crypto.randomUUID();
}

// Propagate through lifecycle
class PlatformModuleContext {
  constructor(
    public readonly correlationId: string,
    public readonly moduleId: string,
    public readonly logger: Logger
  ) {}
}

// Usage in request handler
async function handleRequest(req: Request): Promise<Response> {
  const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  const ctx = new PlatformModuleContext(correlationId, moduleId, logger);
  
  logger.info({ correlationId, moduleId }, 'Processing request');
  
  try {
    return await module.handle(req, ctx);
  } catch (error) {
    logger.error({ err: error, correlationId, moduleId }, 'Request failed');
    throw error;
  }
}
```

---

## Metrics

### Startup Timing Metrics

```typescript
interface IStartupMetrics {
  totalDuration: number;
  phaseDurations: Record<PlatformModuleLifecycleStageType, number>;
  moduleDurations: Record<string, number>;
  dependencyResolutionTime: number;
}

class MetricsCollector {
  private phaseTimings = new Map<string, number>();
  private moduleTimings = new Map<string, number>();

  startPhase(phase: PlatformModuleLifecycleStageType): void {
    this.phaseTimings.set(phase, Date.now());
  }

  endPhase(phase: PlatformModuleLifecycleStageType): number {
    const start = this.phaseTimings.get(phase);
    const duration = Date.now() - start!;
    this.metrics.phaseDurations[phase] = duration;
    return duration;
  }

  trackModuleLoad(moduleId: string, duration: number): void {
    this.moduleTimings.set(moduleId, duration);
    this.metrics.moduleDurations[moduleId] = duration;
  }
}
```

### Module-Level Metrics

```typescript
interface IPlatformModuleMetrics {
  moduleId: string;
  loadCount: number;
  unloadCount: number;
  failureCount: number;
  avgLoadDuration: number;
  lastLoadTime: string;
  lastError?: {
    code: string;
    phase: PlatformModuleLifecycleStageType;
    timestamp: string;
  };
}
```
