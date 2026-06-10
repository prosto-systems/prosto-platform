# @prosto/platform-adapter-admin-bff

Policy-aware admin BFF adapter for plugin discovery, permission mapping, compatibility filtering, diagnostics, and observability.

## Status
- Phase 08 baseline completed
- Phase 09 integration baseline completed
- All exported contracts are marked `@alpha`

## Public API

### Interfaces
- `IAdminBffRequest`
- `IAdminBffResponse`
- `IAdminBffRouteHandler`
- `IAdminBffRouteContext`
- `IAdminOperatorContext`
- `IAdminDiscoveryAggregationService`
- `IAdminPermissionMappingService`
- `IAdminPluginCatalogSource`
- `IAdminDiscoveryResult`
- `IAdminDiscoveryPayloadResult`
- `IAdminDiscoveryDiagnostics`
- `IAdminPermissionFilterResult`
- `IAdminActionEvaluationResult`
- `IPlatformAdminBffAdapterConfig`

### Classes
- `PlatformAdminBffAdapter`

### Services
- `AdminDiscoveryAggregationService`
- `AdminPermissionMappingService`
- `AdminDiagnosticsService`

### Constants
- `AdminBffErrorCodes`
- `AdminBffPhase`

## Usage

```typescript
import {
  PlatformAdminBffAdapter,
  AdminDiscoveryAggregationService,
  AdminPermissionMappingService,
  AdminDiagnosticsService,
} from '@prosto/platform-adapter-admin-bff';

const adapter = new PlatformAdminBffAdapter(
  new AdminDiscoveryAggregationService(/* ... */),
  new AdminPermissionMappingService(/* ... */),
  new AdminDiagnosticsService(/* ... */),
);

const handlers = adapter.getHandlers();
```

## Subsystems

### Discovery
- `AdminDiscoveryAggregationService` — aggregates plugin manifests from catalog sources, validates compatibility, builds discovery payload
- `AdminPluginCatalogSource` — contract for fetching UI plugin manifests from catalog sources

### Permissions
- `AdminPermissionMappingService` — maps operator roles to permissions, evaluates action gates, filters required permissions
- `AdminActionGateEvaluator` — evaluates action gate decisions against permission policies

### Diagnostics
- `AdminDiagnosticsService` — collects and reports diagnostics for discovery and permission operations

### Policy
- `AdminPluginTrustClassFilter` — filters plugins by trust class
- `AdminPluginReviewStatusFilter` — filters plugins by review status
- `AdminPluginPolicyEvaluator` — evaluates plugin admission policies

### Observability
- `IAdminBffLogger` — structured logging interface for admin BFF operations
- `ConsoleAdminBffLogger` — console implementation of admin BFF logger

## Commands
- `npm run --workspace @prosto/platform-adapter-admin-bff build`
- `npm run --workspace @prosto/platform-adapter-admin-bff typecheck`
- `npm run --workspace @prosto/platform-adapter-admin-bff test`

## Notes
- This package is framework-agnostic and does not depend on any HTTP framework.
- Consumers wire it to their transport layer via the route handler interface.
- Depends on `@prosto/platform-admin-contracts` for type-safe contracts.
- All internal contracts are marked `@alpha`.
