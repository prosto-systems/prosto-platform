import { http } from 'msw';
import { addActivity, getMockState, type IMockModule } from '../mock-state';
import {
  ADMIN_API_PATH,
  applyMockLatency,
  errorResponse,
  getAuthenticatedRequest,
  hasPermission,
  hasValidCsrfToken,
  jsonResponse,
} from './handler-utils';

export const dashboardHandlers = [
  http.get(`${ADMIN_API_PATH}/dashboard`, async ({ cookies }) => {
    await applyMockLatency();

    const error = requirePermission(cookies, 'dashboard:view');

    if (error !== undefined) {
      return error;
    }

    const state = getMockState();

    return jsonResponse({
      maintenanceEnabled: state.maintenanceEnabled,
      modules: state.modules.length,
      healthyModules: state.modules.filter(
        (module) => module.status === 'healthy',
      ).length,
      activeSessions: state.sessions.size,
    });
  }),

  http.get(`${ADMIN_API_PATH}/activity`, async ({ cookies }) => {
    await applyMockLatency();

    const error = requirePermission(cookies, 'activity:view');

    if (error !== undefined) {
      return error;
    }

    return jsonResponse(getMockState().activity);
  }),

  http.get(`${ADMIN_API_PATH}/modules`, async ({ cookies }) => {
    await applyMockLatency();

    const error = requirePermission(cookies, 'modules:view');

    if (error !== undefined) {
      return error;
    }

    return jsonResponse(getMockState().modules);
  }),

  http.post(
    `${ADMIN_API_PATH}/modules/:moduleId/restart`,
    async ({ cookies, params, request }) => {
      await applyMockLatency();

      const authenticatedRequest = getAuthenticatedRequest(cookies);

      if (authenticatedRequest === undefined) {
        return errorResponse(401, 'session_expired');
      }

      if (!hasPermission(authenticatedRequest, 'modules:restart')) {
        return errorResponse(403, 'permission_denied');
      }

      if (!hasValidCsrfToken(request, authenticatedRequest)) {
        return errorResponse(403, 'csrf_invalid');
      }

      const module = findModule(params.moduleId);

      if (module === undefined) {
        return errorResponse(404, 'module_not_found');
      }

      module.status = 'healthy';
      addActivity(`Restarted ${module.name}.`);

      return jsonResponse({ accepted: true });
    },
  ),
];

function requirePermission(
  cookies: Readonly<Record<string, string>>,
  permission: Parameters<typeof hasPermission>[1],
) {
  const authenticatedRequest = getAuthenticatedRequest(cookies);

  if (authenticatedRequest === undefined) {
    return errorResponse(401, 'session_expired');
  }

  return hasPermission(authenticatedRequest, permission)
    ? undefined
    : errorResponse(403, 'permission_denied');
}

function findModule(
  moduleId: string | readonly string[] | undefined,
): IMockModule | undefined {
  if (typeof moduleId !== 'string') {
    return undefined;
  }

  return getMockState().modules.find((module) => module.id === moduleId);
}
