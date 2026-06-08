import type {
  AdminDiscoveryRejectionReasonCodeType,
  IAdminRejectedPluginDiagnostic,
} from '@prosto/platform-admin-contracts';
import type {
  IAdminDiscoveryDiagnostics,
  IAdminDiscoveryPayloadResult,
  IAdminDiscoveryResult,
  IAdminOperatorContext,
} from '../admin-bff.interfaces.js';
import type {
  IAdminDiagnosticsMetadata,
  IAdminDiagnosticsPayload,
  IAdminDiagnosticsPluginEntry,
  IAdminDiagnosticsSummary,
} from './admin-diagnostics.types.js';
import type {
  IAdminDiagnosticsRequestContext,
  IAdminDiagnosticsService,
  IAdminDiagnosticsServiceConfig,
} from './admin-diagnostics.interfaces.js';

/**
 * @alpha
 * Diagnostics schema version identifier.
 */
export const ADMIN_DIAGNOSTICS_SCHEMA_VERSION = 'admin-diagnostics.v1' as const;

/**
 * @alpha
 * Default implementation of the admin diagnostics service.
 *
 * Produces structured diagnostics payloads with correlation metadata
 * for incident triage and operational analysis.
 */
export class AdminDiagnosticsService implements IAdminDiagnosticsService {
  private readonly _config: IAdminDiagnosticsServiceConfig;

  constructor(config: IAdminDiagnosticsServiceConfig) {
    this._config = config;
  }

  generateDiagnosticsPayload(
    discoveryResult: IAdminDiscoveryResult,
    requestContext: IAdminDiagnosticsRequestContext,
  ): IAdminDiagnosticsPayload {
    const { payload, diagnostics } = discoveryResult;
    const { correlationId, operatorContext } = requestContext;

    const pluginEntries = this._mapDiscoveryPayloadToEntries(
      payload,
      correlationId,
      operatorContext,
    );

    const summary = this._buildSummary(
      diagnostics,
      payload.rejected.length,
      correlationId,
    );

    const metadata = this._buildMetadata(requestContext);

    return {
      schemaVersion: ADMIN_DIAGNOSTICS_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      correlationId,
      environment: this._config.environment,
      shellVersion: this._config.shellVersion,
      plugins: pluginEntries,
      summary,
      metadata,
    };
  }

  createPluginEntry(
    pluginId: string,
    pluginVersion: string | undefined,
    status: 'accepted' | 'rejected' | 'filtered',
    reasonCode: AdminDiscoveryRejectionReasonCodeType | undefined,
    message: string | undefined,
    remediationHint: string | undefined,
    correlationId: string,
    operatorId: string,
  ): IAdminDiagnosticsPluginEntry {
    return {
      pluginId,
      pluginVersion,
      status,
      reasonCode,
      message,
      remediationHint,
      timestamp: new Date().toISOString(),
      correlationId,
      operatorId,
      environment: this._config.environment,
      shellVersion: this._config.shellVersion,
    };
  }

  aggregateDiagnostics(
    results: readonly IAdminDiscoveryResult[],
    requestContext: IAdminDiagnosticsRequestContext,
  ): IAdminDiagnosticsPayload {
    const { correlationId, operatorContext } = requestContext;

    const allPluginEntries: IAdminDiagnosticsPluginEntry[] = [];
    let totalAccepted = 0;
    let totalRejected = 0;
    let totalFiltered = 0;
    let totalDuration = 0;

    for (const result of results) {
      const entries = this._mapDiscoveryPayloadToEntries(
        result.payload,
        correlationId,
        operatorContext,
      );

      allPluginEntries.push(...entries);

      totalAccepted += result.diagnostics.acceptedCount;
      totalRejected += result.diagnostics.rejectedCount;
      totalFiltered += this._countFilteredEntries(result.payload.rejected);
      totalDuration += result.diagnostics.duration;
    }

    const summary: IAdminDiagnosticsSummary = {
      acceptedCount: totalAccepted,
      rejectedCount: totalRejected,
      filteredCount: totalFiltered,
      totalCount: allPluginEntries.length,
      duration: totalDuration,
      timestamp: new Date().toISOString(),
      correlationId,
      environment: this._config.environment,
    };

    const metadata = this._buildMetadata(requestContext);

    return {
      schemaVersion: ADMIN_DIAGNOSTICS_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      correlationId,
      environment: this._config.environment,
      shellVersion: this._config.shellVersion,
      plugins: allPluginEntries,
      summary,
      metadata,
    };
  }

  private _mapDiscoveryPayloadToEntries(
    payload: IAdminDiscoveryPayloadResult,
    correlationId: string,
    operatorContext: IAdminOperatorContext,
  ): IAdminDiagnosticsPluginEntry[] {
    const entries: IAdminDiagnosticsPluginEntry[] = [];

    for (const plugin of payload.plugins) {
      entries.push(
        this.createPluginEntry(
          plugin.id,
          plugin.version,
          'accepted',
          undefined,
          undefined,
          undefined,
          correlationId,
          operatorContext.operatorId,
        ),
      );
    }

    for (const rejected of payload.rejected) {
      entries.push(
        this._mapRejectedDiagnosticToEntry(
          rejected,
          correlationId,
          operatorContext.operatorId,
        ),
      );
    }

    return entries;
  }

  private _mapRejectedDiagnosticToEntry(
    diagnostic: IAdminRejectedPluginDiagnostic,
    correlationId: string,
    operatorId: string,
  ): IAdminDiagnosticsPluginEntry {
    return {
      pluginId: diagnostic.id ?? 'unknown',
      pluginVersion: diagnostic.version,
      status: 'rejected',
      reasonCode: diagnostic.reasonCode,
      message: diagnostic.message,
      remediationHint: diagnostic.remediationHint,
      timestamp: new Date().toISOString(),
      correlationId,
      operatorId,
      environment: this._config.environment,
      shellVersion: this._config.shellVersion,
    };
  }

  private _buildSummary(
    diagnostics: IAdminDiscoveryDiagnostics,
    rejectedCount: number,
    correlationId: string,
  ): IAdminDiagnosticsSummary {
    return {
      acceptedCount: diagnostics.acceptedCount,
      rejectedCount: diagnostics.rejectedCount,
      filteredCount: rejectedCount - diagnostics.rejectedCount,
      totalCount: diagnostics.acceptedCount + diagnostics.rejectedCount,
      duration: diagnostics.duration,
      timestamp: new Date().toISOString(),
      correlationId,
      environment: this._config.environment,
    };
  }

  private _buildMetadata(
    requestContext: IAdminDiagnosticsRequestContext,
  ): IAdminDiagnosticsMetadata {
    return {
      operatorId: requestContext.operatorContext.operatorId,
      operatorRoles: [...requestContext.operatorContext.roleIds],
      requestPath: requestContext.requestPath,
      userAgent: requestContext.userAgent,
      clientIp: requestContext.clientIp,
      discoveryPipelineVersion: this._config.discoveryPipelineVersion,
    };
  }

  private _countFilteredEntries(
    rejected: readonly IAdminRejectedPluginDiagnostic[],
  ): number {
    return rejected.filter((r) => r.reasonCode === 'PERMISSION_FILTERED')
      .length;
  }
}
