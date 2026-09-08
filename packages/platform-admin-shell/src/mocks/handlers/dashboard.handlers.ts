import { http } from 'msw';
import { getMockState } from '../mock-state';
import {
  ADMIN_API_PATH,
  applyMockLatency,
  errorResponse,
  getAuthenticatedRequest,
  hasPermission,
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
