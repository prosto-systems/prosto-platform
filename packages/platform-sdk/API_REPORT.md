# @prosto/platform-sdk API Report (Phase 03)

Generated from current exported contract surface in `packages/platform-sdk/src/index.ts`.

Status context:
- Phase 03: completed (SDK contract baseline)

## Surface Version
- `SDK_CONTRACT_SURFACE_VERSION` (`@alpha`)

## Constants
- `MODULE_LIFECYCLE_STAGES` (`@alpha`)
- `STARTUP_POLICIES` (`@alpha`)
- `MODULE_ID_PATTERN` (`@alpha`)
- `MODULE_CAPABILITY_PATTERN` (`@alpha`)
- `MODULE_SECURITY_CLASSES` (`@alpha`)
- `MODULE_CRITICALITY_LEVELS` (`@alpha`)
- `SERVICE_TOKEN_NAME_PREFIX` (`@alpha`)
- `EVENT_TOKEN_NAME_PREFIX` (`@alpha`)

## Types
- `ModuleLifecycleStageType` (`@alpha`)
- `StartupPolicyType` (`@alpha`)
- `ModuleLifecycleResultType` (`@alpha`)
- `ModuleIdentifierType` (`@alpha`)
- `SemverVersionType` (`@alpha`)
- `SemverRangeType` (`@alpha`)
- `ModuleSecurityClassType` (`@alpha`)
- `ModuleCriticalityType` (`@alpha`)
- `ModuleCapabilityType` (`@alpha`)
- `TokenNameType` (`@alpha`)
- `ServiceTokenType` (`@alpha`)
- `EventTokenType` (`@alpha`)

## Interfaces
- `IServiceRegistry` (`@alpha`)
- `IEventMetadata` (`@alpha`)
- `IEventEnvelope` (`@alpha`)
- `EventHandlerType` (`@alpha`)
- `IEventBus` (`@alpha`)
- `IModuleLogger` (`@alpha`)
- `IModuleContext` (`@alpha`)
- `IPlatformModule` (`@alpha`)
- `IModuleIdentity` (`@alpha`)
- `IModuleCompatibility` (`@alpha`)
- `IModuleDependency` (`@alpha`)
- `IPlatformModuleManifest` (`@alpha`)
- `IPlatformRuntimeVersionContext` (`@alpha`)
- `IModuleCompatibilityValidationSuccess` (`@alpha`)
- `IModuleCompatibilityValidationFailure` (`@alpha`)
- `IModuleManifestValidationSuccess` (`@alpha`)
- `IModuleManifestValidationFailure` (`@alpha`)
- `ModuleCompatibilityValidationResultType` (`@alpha`)
- `ModuleManifestValidationResultType` (`@alpha`)
- `IModuleManifestValidator` (`@alpha`)
- `IModuleCompatibilityValidator` (`@alpha`)

## Errors
- `PlatformSdkErrorCodeType` (`@alpha`)
- `PlatformSdkError` (`@alpha`)
- `IManifestValidationIssue` (`@alpha`)
- `ManifestValidationError` (`@alpha`)
- `CompatibilityFieldType` (`@alpha`)
- `CompatibilityIssueCodeType` (`@alpha`)
- `ICompatibilityValidationIssue` (`@alpha`)
- `CompatibilityValidationError` (`@alpha`)

## Schemas
- `SemverVersionSchema` (`@alpha`)
- `SemverRangeSchema` (`@alpha`)
- `CapabilitySchema` (`@alpha`)
- `ModuleDependencySchema` (`@alpha`)
- `PlatformModuleManifestSchema` (`@alpha`)
- `PlatformModuleManifestInputType` (`@alpha`)
- `PlatformModuleManifestOutputType` (`@alpha`)

## Utilities
- `isSemverVersion` (`@alpha`)
- `isSemverRange` (`@alpha`)
- `isSemverSatisfied` (`@alpha`)
- `getServiceTokenKey` (`@alpha`)
- `getEventTokenKey` (`@alpha`)
- `createServiceToken` (`@alpha`)
- `createEventToken` (`@alpha`)

## Validators
- `PlatformModuleManifestValidator` (`@alpha`)
- `PlatformModuleCompatibilityValidator` (`@alpha`)
