import { http } from 'msw';
import { z } from 'zod';
import { addActivity, getMockState } from '../mock-state';
import {
  ADMIN_API_PATH,
  applyMockLatency,
  errorResponse,
  getAuthenticatedRequest,
  hasPermission,
  hasValidCsrfToken,
  jsonResponse,
} from './handler-utils';

const maintenanceRequestSchema = z.object({ enabled: z.boolean() });

export const platformHandlers = [
  http.get(
    `${ADMIN_API_PATH}/platform/manifest`,
    async ({ cookies, request }) => {
      await applyMockLatency();

      const authenticatedRequest = getAuthenticatedRequest(cookies);

      if (authenticatedRequest === undefined) {
        return errorResponse(401, 'session_expired');
      }

      // if (!hasPermission(authenticatedRequest, 'modules:view')) {
      //   return errorResponse(403, 'permission_denied');
      // }

      if (!hasValidCsrfToken(request, authenticatedRequest)) {
        return errorResponse(403, 'csrf_invalid');
      }

      return jsonResponse(getMockState().manifest);
    },
  ),

  http.get(`${ADMIN_API_PATH}/platform/health`, async ({ cookies }) => {
    await applyMockLatency();

    const error = requirePermission(cookies, 'health:view');

    if (error !== undefined) {
      return error;
    }

    return jsonResponse({
      status: getMockState().maintenanceEnabled ? 'maintenance' : 'healthy',
      services: [
        { name: 'API gateway', status: 'healthy' },
        { name: 'Module registry', status: 'healthy' },
      ],
    });
  }),

  http.post(
    `${ADMIN_API_PATH}/platform/restart`,
    async ({ cookies, request }) => {
      await applyMockLatency();

      const authenticatedRequest = getAuthenticatedRequest(cookies);

      if (authenticatedRequest === undefined) {
        return errorResponse(401, 'session_expired');
      }

      if (!hasPermission(authenticatedRequest, 'platform:restart')) {
        return errorResponse(403, 'permission_denied');
      }

      if (!hasValidCsrfToken(request, authenticatedRequest)) {
        return errorResponse(403, 'csrf_invalid');
      }

      addActivity('Restarted the platform.');

      return jsonResponse({ accepted: true });
    },
  ),

  http.patch(
    `${ADMIN_API_PATH}/platform/maintenance`,
    async ({ cookies, request }) => {
      await applyMockLatency();

      const authenticatedRequest = getAuthenticatedRequest(cookies);

      if (authenticatedRequest === undefined) {
        return errorResponse(401, 'session_expired');
      }

      if (!hasPermission(authenticatedRequest, 'maintenance:manage')) {
        return errorResponse(403, 'permission_denied');
      }

      if (!hasValidCsrfToken(request, authenticatedRequest)) {
        return errorResponse(403, 'csrf_invalid');
      }

      const parsed = maintenanceRequestSchema.safeParse(
        await readJson(request),
      );

      if (!parsed.success) {
        return errorResponse(422, 'validation_failed');
      }

      getMockState().maintenanceEnabled = parsed.data.enabled;
      addActivity(
        `Maintenance mode ${parsed.data.enabled ? 'enabled' : 'disabled'}.`,
        parsed.data.enabled ? 'warning' : 'info',
      );

      return jsonResponse({ enabled: parsed.data.enabled });
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

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
