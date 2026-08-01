# @prosto/platform-sdk API Report (Phase 03)

Generated from current exported contract surface in `packages/platform-sdk/src/index.ts`.

Status context:
- Phase 03: completed (SDK contract baseline)

## Surface Version
- `SDK_CONTRACT_VERSION` (`@alpha`)

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
- `PlatformModuleLifecycleStageType` (`@alpha`)
- `PlatformStartupPolicyType` (`@alpha`)
- `PlatformModuleLifecycleResultType` (`@alpha`)
- `ModuleIdentifierType` (`@alpha`)
- `SemverVersionType` (`@alpha`)
- `SemverRangeType` (`@alpha`)
- `ModuleSecurityClassType` (`@alpha`)
- `ModuleCriticalityType` (`@alpha`)
- `ModuleCapabilityType` (`@alpha`)
- `ServiceTokenType` (`@alpha`)
- `EventTokenType` (`@alpha`)
- `PersistenceOwnerType` (`@alpha`)
- `PersistenceDescriptorPayloadType` (`@alpha`)
- `PersistenceProviderStateType` (`@alpha`)
- `PersistenceErrorCodeType` (`@alpha`)

## Interfaces
- `IServiceRegistry` (`@alpha`)
- `IEventMetadata` (`@alpha`)
- `IEventEnvelope` (`@alpha`)
- `EventHandlerType` (`@alpha`)
- `IEventBus` (`@alpha`)
- `IPlatformModuleLogger` (`@alpha`)
- `IPlatformModuleContext` (`@alpha`)
- `IPlatformModule` (`@alpha`)
- `IPlatformModuleIdentity` (`@alpha`)
- `IPlatformModuleCompatibility` (`@alpha`)
- `IPlatformModuleDependency` (`@alpha`)
- `IPlatformModuleManifest` (`@alpha`)
- `IPlatformRuntimeVersionContext` (`@alpha`)
- `IPlatformModuleCompatibilityValidationSuccess` (`@alpha`)
- `IPlatformModuleCompatibilityValidationFailure` (`@alpha`)
- `IPlatformModuleManifestValidationSuccess` (`@alpha`)
- `IPlatformModuleManifestValidationFailure` (`@alpha`)
- `PlatformModuleCompatibilityValidationResultType` (`@alpha`)
- `PlatformModuleManifestValidationResultType` (`@alpha`)
- `IPlatformModuleManifestValidator` (`@alpha`)
- `IPlatformModuleCompatibilityValidator` (`@alpha`)
- `IPersistenceDescriptor` (`@alpha`)
- `IPersistenceDescriptorRegistry` (`@alpha`)
- `IPersistenceInitializationInput` (`@alpha`)
- `IPersistenceProvider` (`@alpha`)
- `IPersistenceModuleContext` (`@alpha`)
- `IPersistenceErrorDetails` (`@alpha`)

## Errors
- `PlatformSdkError` (`@alpha`)
- `IPlatformModuleManifestValidationIssue` (`@alpha`)
- `PlatformModuleManifestValidationError` (`@alpha`)
- `PlatformModuleCompatibilityIssueCodeType` (`@alpha`)
- `IPlatformModuleCompatibilityValidationIssue` (`@alpha`)
- `PlatformModuleCompatibilityValidationError` (`@alpha`)
- `PersistenceError` (`@alpha`)
- `PersistenceNotReadyError` (`@alpha`)

## Schemas
- `SemverVersionSchema` (`@alpha`)
- `SemverRangeSchema` (`@alpha`)
- `CapabilitySchema` (`@alpha`)
- `PlatformModuleDependencySchema` (`@alpha`)
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
- `resolveNestedValue` (`@alpha`)

## Validators
- `PlatformModuleManifestValidator` (`@alpha`)
- `PlatformModuleCompatibilityValidator` (`@alpha`)

## Services
- `PersistenceDescriptorRegistry` (`@alpha`)
