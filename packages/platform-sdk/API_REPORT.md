# @prosto/platform-sdk API Report (Phase 03)

Generated from current exported contract surface in `packages/platform-sdk/src/index.ts`.

Status context:
- Phase 03: completed (SDK contract baseline)

## Surface Version
- `SDK_CONTRACT_SURFACE_VERSION` (`@stable`)

## Constants
- `MODULE_LIFECYCLE_STAGES` (`@stable`)
- `STARTUP_POLICIES` (`@stable`)
- `MODULE_ID_PATTERN` (`@stable`)
- `MODULE_CAPABILITY_PATTERN` (`@stable`)
- `MODULE_SECURITY_CLASSES` (`@stable`)
- `MODULE_CRITICALITY_LEVELS` (`@stable`)
- `SERVICE_TOKEN_NAME_PREFIX` (`@stable`)
- `EVENT_TOKEN_NAME_PREFIX` (`@stable`)

## Types
- `ModuleLifecycleStageType` (`@stable`)
- `StartupPolicyType` (`@stable`)
- `ModuleLifecycleResultType` (`@stable`)
- `ModuleIdentifierType` (`@stable`)
- `SemverVersionType` (`@stable`)
- `SemverRangeType` (`@stable`)
- `ModuleSecurityClassType` (`@stable`)
- `ModuleCriticalityType` (`@stable`)
- `ModuleCapabilityType` (`@stable`)
- `TokenNameType` (`@stable`)
- `ServiceTokenType` (`@stable`)
- `EventTokenType` (`@stable`)

## Interfaces
- `IServiceRegistry` (`@stable`)
- `IEventMetadata` (`@stable`)
- `IEventEnvelope` (`@stable`)
- `EventHandlerType` (`@stable`)
- `IEventBus` (`@stable`)
- `IModuleLogger` (`@stable`)
- `IModuleContext` (`@stable`)
- `IPlatformModule` (`@stable`)
- `IModuleIdentity` (`@stable`)
- `IModuleCompatibility` (`@stable`)
- `IModuleDependency` (`@stable`)
- `IPlatformModuleManifest` (`@stable`)

## Errors
- `PlatformSdkErrorCodeType` (`@stable`)
- `PlatformSdkError` (`@stable`)
- `IManifestValidationIssue` (`@stable`)
- `ManifestValidationError` (`@stable`)
- `CompatibilityFieldType` (`@stable`)
- `CompatibilityIssueCodeType` (`@stable`)
- `ICompatibilityValidationIssue` (`@stable`)
- `CompatibilityValidationError` (`@stable`)

## Schemas
- `SemverVersionSchema` (`@stable`)
- `SemverRangeSchema` (`@stable`)
- `CapabilitySchema` (`@stable`)
- `ModuleDependencySchema` (`@stable`)
- `PlatformModuleManifestSchema` (`@stable`)
- `PlatformModuleManifestInputType` (`@stable`)
- `PlatformModuleManifestOutputType` (`@stable`)

## Utilities
- `isSemverVersion` (`@stable`)
- `isSemverRange` (`@stable`)
- `isSemverSatisfied` (`@stable`)
- `getServiceTokenKey` (`@stable`)
- `getEventTokenKey` (`@stable`)
- `createServiceToken` (`@stable`)
- `createEventToken` (`@stable`)

## Validation
- `IManifestValidationSuccess` (`@stable`)
- `IManifestValidationFailure` (`@stable`)
- `ManifestValidationResultType` (`@stable`)
- `safeValidatePlatformModuleManifest` (`@stable`)
- `parsePlatformModuleManifest` (`@stable`)
- `IPlatformRuntimeVersionContext` (`@stable`)
- `ICompatibilityValidationSuccess` (`@stable`)
- `ICompatibilityValidationFailure` (`@stable`)
- `CompatibilityValidationResultType` (`@stable`)
- `validateManifestCompatibility` (`@stable`)
- `assertManifestCompatibility` (`@stable`)
