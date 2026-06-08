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
 * Diagnostics route handler.
 *
 * Returns detailed diagnostics about plugin discovery including
 * accepted and rejected plugins with structured reason taxonomy
 * and correlation metadata for incident triage.
 *
 * Observability: logs diagnostics generation timing and payload summary.
 */
export class AdminDiagnosticsRouteHandler implements IAdminBffRouteHandler {
  readonly route = ADMIN_BFF_ROUTES.DIAGNOSTICS;
  readonly method = 'GET' as const;

  async handle(
    request: IAdminBffRequest,
    context: IAdminBffRouteContext,
  ): Promise<IAdminBffResponse> {
    const startTime = Date.now();

    context.logger.debug('Diagnostics generation started', {
      phase: AdminBffPhase.DIAGNOSTICS,
      correlationId: context.correlationId,
      operatorId: context.operatorContext.operatorId,
    });

    const result = await context.discoveryService.discover(
      context.operatorContext,
    );

    const diagnosticsPayload =
      context.diagnosticsService.generateDiagnosticsPayload(result, {
        correlationId: context.correlationId,
        operatorContext: context.operatorContext,
        requestPath: request.path,
        userAgent: request.headers['user-agent'] as string | undefined,
        clientIp: request.headers['x-forwarded-for'] as string | undefined,
      });

    const duration = Date.now() - startTime;

    context.logger.info('Diagnostics generated', {
      phase: AdminBffPhase.DIAGNOSTICS,
      correlationId: context.correlationId,
      event: AdminBffLogEvents.DIAGNOSTICS_GENERATED,
      totalPlugins: diagnosticsPayload.plugins.length,
      acceptedCount: diagnosticsPayload.summary.acceptedCount,
      rejectedCount: diagnosticsPayload.summary.rejectedCount,
      duration,
    });

    return {
      status: 200,
      body: diagnosticsPayload,
    };
  }
}
