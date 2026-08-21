import { http } from 'msw';
import {
  loginRequestSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} from '@/features/auth';
import {
  createResetToken,
  createSession,
  destroySession,
  findUserByEmail,
  getPermissions,
  getMockState,
  type IMockUser,
} from '../mock-state';
import {
  ADMIN_API_PATH,
  applyMockLatency,
  createExpiredSessionCookie,
  createSessionCookie,
  errorResponse,
  getAuthenticatedRequest,
  jsonResponse,
  hasValidCsrfToken,
} from './handler-utils';

const invalidCredentialsResponse = (): Response =>
  errorResponse(401, 'invalid_credentials');

export const authHandlers = [
  http.post(`${ADMIN_API_PATH}/auth/login`, async ({ request }) => {
    await applyMockLatency();

    const requestBody = await readJson(request);
    const parsed = loginRequestSchema.safeParse(requestBody);

    if (!parsed.success) {
      return errorResponse(422, 'validation_failed');
    }

    const user = findUserByEmail(parsed.data.email);

    if (user === undefined || user.password !== parsed.data.password) {
      return invalidCredentialsResponse();
    }

    const session = createSession(user);

    return jsonResponse(createSessionResponse(user, session.csrfToken), 200, {
      'Set-Cookie': createSessionCookie(session),
    });
  }),

  http.get(`${ADMIN_API_PATH}/auth/session`, async ({ cookies }) => {
    await applyMockLatency();

    const authenticatedRequest = getAuthenticatedRequest(cookies);

    if (authenticatedRequest === undefined) {
      return errorResponse(401, 'session_expired');
    }

    return jsonResponse(
      createSessionResponse(
        authenticatedRequest.user,
        authenticatedRequest.session.csrfToken,
      ),
    );
  }),

  http.post(`${ADMIN_API_PATH}/auth/logout`, async ({ cookies, request }) => {
    await applyMockLatency();

    const authenticatedRequest = getAuthenticatedRequest(cookies);

    if (authenticatedRequest === undefined) {
      return errorResponse(401, 'session_expired');
    }

    if (!hasValidCsrfToken(request, authenticatedRequest)) {
      return errorResponse(403, 'csrf_invalid');
    }

    destroySession(authenticatedRequest.session.id);

    return new Response(null, {
      status: 204,
      headers: { 'Set-Cookie': createExpiredSessionCookie() },
    });
  }),

  http.post(
    `${ADMIN_API_PATH}/auth/password-reset-requests`,
    async ({ request }) => {
      await applyMockLatency();

      const requestBody = await readJson(request);
      const parsed = passwordResetRequestSchema.safeParse(requestBody);

      if (!parsed.success) {
        return errorResponse(422, 'validation_failed');
      }

      const user = findUserByEmail(parsed.data.email);

      if (user !== undefined) {
        createResetToken(user);
      }

      return jsonResponse({ accepted: true });
    },
  ),

  http.post(`${ADMIN_API_PATH}/auth/password-resets`, async ({ request }) => {
    await applyMockLatency();

    const requestBody = await readJson(request);
    const parsed = passwordResetSchema.safeParse(requestBody);

    if (!parsed.success) {
      return errorResponse(422, 'validation_failed');
    }

    const token = getMockState().resetTokens.get(parsed.data.token);

    if (token === undefined || token.used || token.expiresAt <= Date.now()) {
      return errorResponse(422, 'reset_token_invalid');
    }

    const user = getMockState().users.get(token.userId);

    if (user === undefined) {
      return errorResponse(422, 'reset_token_invalid');
    }

    user.password = parsed.data.password;
    token.used = true;

    return jsonResponse({ accepted: true });
  }),
];

function createSessionResponse(user: IMockUser, csrfToken: string): object {
  return {
    csrfToken,
    permissions: getPermissions(user.role),
    principal: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  };
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
