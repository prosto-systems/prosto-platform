import type {
  IAdminBffRequest,
  IAdminBffResponse,
  IAdminBffRouteContext,
  IAdminBffRouteHandler,
} from '../admin-bff.interfaces.js';
import {
  AdminBffErrorCodes,
  AdminBffLogEvents,
  AdminBffPhase,
} from '@/observability/index.js';
import { ADMIN_BFF_ROUTES } from '../admin-bff.constants.js';

/**
 * @alpha
 * Permission-aware action route handler.
 *
 * Evaluates operator permissions against the requested action gate
 * and returns an allow/deny decision with remediation metadata.
 *
 * Observability: logs action evaluation outcomes and permission denials.
 */
export class AdminActionRouteHandler implements IAdminBffRouteHandler {
  readonly route = ADMIN_BFF_ROUTES.ACTION;
  readonly method = 'POST' as const;

  async handle(
    request: IAdminBffRequest,
    context: IAdminBffRouteContext,
  ): Promise<IAdminBffResponse> {
    const actionId = request.params['actionId'];

    if (!actionId) {
      context.logger.warn('Action evaluation requested without actionId', {
        phase: AdminBffPhase.ACTION_EVALUATION,
        correlationId: context.correlationId,
        errorCode: AdminBffErrorCodes.VALIDATION_FAILED,
        operatorId: context.operatorContext.operatorId,
      });

      return {
        status: 400,
        body: {
          correlationId: context.correlationId,
          error: {
            code: 'MISSING_ACTION_ID',
            message: 'Action ID is required.',
          },
        },
      };
    }

    context.logger.debug('Evaluating action gate', {
      phase: AdminBffPhase.ACTION_EVALUATION,
      correlationId: context.correlationId,
      actionId,
      operatorId: context.operatorContext.operatorId,
      operatorRoles: context.operatorContext.roleIds,
    });

    const evaluation = context.permissionService.evaluateAction(
      actionId,
      context.operatorContext,
    );

    if (!evaluation.allowed) {
      context.logger.warn('Action denied', {
        phase: AdminBffPhase.ACTION_EVALUATION,
        correlationId: context.correlationId,
        event: AdminBffLogEvents.ACTION_EVALUATED,
        actionId,
        allowed: false,
        reasonCode: evaluation.reasonCode,
        operatorId: context.operatorContext.operatorId,
        operatorRoles: context.operatorContext.roleIds,
        errorCode: AdminBffErrorCodes.PERMISSION_DENIED,
      });

      return {
        status: 403,
        body: {
          correlationId: context.correlationId,
          error: {
            code: evaluation.reasonCode ?? 'ACTION_DENIED',
            message: `Action "${actionId}" is not permitted.`,
            remediationHint: evaluation.remediationHint,
          },
        },
      };
    }

    context.logger.info('Action allowed', {
      phase: AdminBffPhase.ACTION_EVALUATION,
      correlationId: context.correlationId,
      event: AdminBffLogEvents.ACTION_EVALUATED,
      actionId,
      allowed: true,
      operatorId: context.operatorContext.operatorId,
      operatorRoles: context.operatorContext.roleIds,
    });

    return {
      status: 200,
      body: {
        correlationId: context.correlationId,
        data: {
          actionId: evaluation.actionId,
          allowed: true,
        },
      },
    };
  }
}
