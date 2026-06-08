import type {
  IAdminDiscoveredPluginDescriptor,
  IAdminRejectedPluginDiagnostic,
} from '@prosto/platform-admin-contracts';
import type { IAdminDiagnosticsService } from './diagnostics/index.js';
import type { IAdminBffLogger } from './observability/admin-bff-logger.interface.js';

/**
 * @alpha
 * Framework-agnostic HTTP request representation for admin BFF routes.
 */
export interface IAdminBffRequest {
  readonly method: string;
  readonly path: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

/**
 * @alpha
 * Framework-agnostic HTTP response representation returned by admin BFF routes.
 */
export interface IAdminBffResponse {
  readonly status: number;
  readonly body: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

/**
 * @alpha
 * Framework-agnostic route handler contract for admin BFF operations.
 */
export interface IAdminBffRouteHandler {
  readonly route: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handle(
    request: IAdminBffRequest,
    context: IAdminBffRouteContext,
  ): Promise<IAdminBffResponse>;
}

/**
 * @alpha
 * Execution context injected into every admin BFF route handler.
 */
export interface IAdminBffRouteContext {
  readonly correlationId: string;
  readonly operatorContext: IAdminOperatorContext;
  readonly discoveryService: IAdminDiscoveryAggregationService;
  readonly permissionService: IAdminPermissionMappingService;
  readonly diagnosticsService: IAdminDiagnosticsService;
  readonly logger: IAdminBffLogger;
}

/**
 * @alpha
 * Operator identity context extracted from upstream authentication.
 */
export interface IAdminOperatorContext {
  readonly operatorId: string;
  readonly roleIds: readonly string[];
  readonly permissions?: readonly string[];
}

/**
 * @alpha
 * Aggregation service contract for admin plugin discovery.
 */
export interface IAdminDiscoveryAggregationService {
  discover(
    operatorContext: IAdminOperatorContext,
  ): Promise<IAdminDiscoveryResult>;
}

/**
 * @alpha
 * Permission filtering result for plugin permission checks.
 */
export interface IAdminPermissionFilterResult {
  readonly allowed: boolean;
  readonly missingPermissions: readonly string[];
}

/**
 * @alpha
 * Permission mapping service contract for admin action gating.
 */
export interface IAdminPermissionMappingService {
  evaluateAction(
    actionId: string,
    operatorContext: IAdminOperatorContext,
  ): IAdminActionEvaluationResult;

  filterPermissions(
    requiredPermissions: readonly string[],
    operatorContext: IAdminOperatorContext,
  ): IAdminPermissionFilterResult;
}

/**
 * @alpha
 * Contract for fetching raw UI plugin manifests from catalog sources.
 */
export interface IAdminPluginCatalogSource {
  fetchUIPluginManifests(): Promise<readonly unknown[]>;
}

/**
 * @alpha
 * Result of a discovery aggregation pipeline.
 */
export interface IAdminDiscoveryResult {
  readonly payload: IAdminDiscoveryPayloadResult;
  readonly diagnostics: IAdminDiscoveryDiagnostics;
}

/**
 * @alpha
 * The discovery payload returned to the admin shell.
 */
export interface IAdminDiscoveryPayloadResult {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly plugins: readonly IAdminDiscoveredPluginDescriptor[];
  readonly rejected: readonly IAdminRejectedPluginDiagnostic[];
}

/**
 * @alpha
 * Diagnostics metadata for the discovery operation.
 */
export interface IAdminDiscoveryDiagnostics {
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly duration: number;
}

/**
 * @alpha
 * Result of an action permission evaluation.
 */
export interface IAdminActionEvaluationResult {
  readonly allowed: boolean;
  readonly actionId: string;
  readonly reasonCode?: string;
  readonly remediationHint?: string;
}
