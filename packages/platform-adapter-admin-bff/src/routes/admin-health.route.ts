import type {
  IAdminBffRequest,
  IAdminBffResponse,
  IAdminBffRouteContext,
  IAdminBffRouteHandler,
} from '../admin-bff.interfaces.js';
import { AdminBffLogEvents, AdminBffPhase } from '@/observability/index.js';
import { ADMIN_BFF_ROUTES } from '../admin-bff.constants.js';

/**
 * @alpha
 * Health and diagnostics route handler.
 *
 * Returns operational health status for the admin BFF adapter
 * including discovery lifecycle metrics, uptime, and version information.
 *
 * Observability: logs health check results with per-check status
 * and discovery statistics for operational monitoring.
 */
export class AdminHealthRouteHandler implements IAdminBffRouteHandler {
  readonly route = ADMIN_BFF_ROUTES.HEALTH;
  readonly method = 'GET' as const;

  async handle(
    _request: IAdminBffRequest,
    context: IAdminBffRouteContext,
  ): Promise<IAdminBffResponse> {
    const startTime = Date.now();

    context.logger.debug('Health check started', {
      phase: AdminBffPhase.HEALTH_CHECK,
      correlationId: context.correlationId,
    });

    const discoveryResult = await context.discoveryService.discover(
      context.operatorContext,
    );

    const discoveryDuration = Date.now() - startTime;
    const status =
      discoveryResult.diagnostics.rejectedCount > 0 ? 'degraded' : 'healthy';

    const checks = [
      {
        name: 'discovery_pipeline',
        status: discoveryResult.diagnostics.rejectedCount > 0 ? 'warn' : 'pass',
        details: `${discoveryResult.diagnostics.acceptedCount} accepted, ${discoveryResult.diagnostics.rejectedCount} rejected`,
        duration: discoveryDuration,
      },
    ];

    context.logger.info('Health check completed', {
      phase: AdminBffPhase.HEALTH_CHECK,
      correlationId: context.correlationId,
      event: AdminBffLogEvents.HEALTH_CHECK_RESULT,
      status,
      acceptedPlugins: discoveryResult.diagnostics.acceptedCount,
      rejectedPlugins: discoveryResult.diagnostics.rejectedCount,
      discoveryDuration,
      checks: checks.length,
    });

    return {
      status: 200,
      body: {
        status,
        checks,
        correlationId: context.correlationId,
        adapter: 'platform-adapter-admin-bff',
        version: '0.0.0',
        timestamp: new Date().toISOString(),
        discovery: {
          acceptedPlugins: discoveryResult.diagnostics.acceptedCount,
          rejectedPlugins: discoveryResult.diagnostics.rejectedCount,
        },
      },
    };
  }
}
