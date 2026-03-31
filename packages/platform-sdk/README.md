# @prosto/platform-sdk

Contract authority for Prosto platform module manifests, lifecycle interfaces, typed tokens, and validation primitives.

## Status
- Phase 03 baseline completed
- All exported contracts are marked `@stable`

## Public API

### Constants
- `MODULE_LIFECYCLE_STAGES`
- `STARTUP_POLICIES`
- `MODULE_ID_PATTERN`
- `MODULE_CAPABILITY_PATTERN`
- `MODULE_SECURITY_CLASSES`
- `MODULE_CRITICALITY_LEVELS`
- `SERVICE_TOKEN_NAME_PREFIX`
- `EVENT_TOKEN_NAME_PREFIX`

### Types
- `ModuleLifecycleStageType`
- `StartupPolicyType`
- `ModuleLifecycleResultType`
- `ModuleIdentifierType`
- `SemverVersionType`
- `SemverRangeType`
- `ModuleSecurityClassType`
- `ModuleCriticalityType`
- `ModuleCapabilityType`
- `TokenNameType`
- `ServiceTokenType<TService>`
- `EventTokenType<TPayload>`
- `EventHandlerType<TPayload>`
- `ManifestValidationResultType`
- `CompatibilityValidationResultType`
- `PlatformModuleManifestInputType`
- `PlatformModuleManifestOutputType`
- `PlatformSdkErrorCodeType`
- `CompatibilityIssueCodeType`
- `CompatibilityFieldType`

### Interfaces
- `IServiceRegistry`
- `IEventBus`
- `IEventEnvelope<TPayload>`
- `IModuleLogger`
- `IModuleContext`
- `IPlatformModule`
- `IModuleIdentity`
- `IModuleCompatibility`
- `IModuleDependency`
- `IPlatformModuleManifest`
- `IPlatformRuntimeVersionContext`
- `IManifestValidationIssue`
- `IManifestValidationSuccess`
- `IManifestValidationFailure`
- `ICompatibilityValidationIssue`
- `ICompatibilityValidationSuccess`
- `ICompatibilityValidationFailure`

### Schemas
- `SemverVersionSchema`
- `SemverRangeSchema`
- `CapabilitySchema`
- `ModuleDependencySchema`
- `PlatformModuleManifestSchema`

### Utilities
- `isSemverVersion`
- `isSemverRange`
- `isSemverSatisfied`
- `getServiceTokenKey`
- `getEventTokenKey`
- `createServiceToken`
- `createEventToken`

### Validation
- `safeValidatePlatformModuleManifest`
- `parsePlatformModuleManifest`
- `validateManifestCompatibility`
- `assertManifestCompatibility`

### Errors
- `PlatformSdkError`
- `ManifestValidationError`
- `CompatibilityValidationError`

## Usage

```ts
import {
  createEventToken,
  createServiceToken,
  parsePlatformModuleManifest,
  validateManifestCompatibility,
} from '@prosto/platform-sdk';

const manifest = parsePlatformModuleManifest({
  id: 'module-health',
  version: '1.2.3',
  sdkVersion: '^0.1.0',
  criticality: 'normal',
  securityClass: 'internal',
  capabilities: ['feature.health'],
  dependencies: [],
});

const compatibility = validateManifestCompatibility(manifest, {
  sdkVersion: '0.1.5',
});

const healthEventToken = createEventToken<{ status: 'ok' | 'failed'; }>('health.updated');
const healthServiceToken = createServiceToken<{ ping: () => 'ok' | 'failed' }>('health.service');

eventBus.subscribe(healthEventToken, (payload) => {
  if (payload.status === 'ok') {
    logger.info('Healthy');
  } else {
    logger.warn('Unhealthy');
  }
});

serviceRegistry.register(healthServiceToken, {
  ping: () => 'ok',
});

const healthService = serviceRegistry.resolve(healthServiceToken);
```

## Commands
- `npm run --workspace @prosto/platform-sdk build`
- `npm run --workspace @prosto/platform-sdk typecheck`
- `npm run --workspace @prosto/platform-sdk test`
- `npm run --workspace @prosto/platform-sdk test:unit`
- `npm run --workspace @prosto/platform-sdk test:types`

## Notes
- This package is contract-only and does not implement runtime module loading.
- Runtime lifecycle orchestration belongs to `@prosto/platform-core` in later phases.
- Runtime validation primitives depend only on `zod` and `semver`.
