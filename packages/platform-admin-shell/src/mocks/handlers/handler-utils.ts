import type { AdminShellPermissionType } from '@prosto/platform-sdk';
import type { JsonBodyType } from 'msw';
import { delay, HttpResponse } from 'msw';
import {
  findActiveSession,
  getMockState,
  getPermissions,
  type IMockSession,
  type IMockUser,
} from '../mock-state';

export const ADMIN_API_PATH = '*/api/admin';

const SESSION_COOKIE_NAME = 'prosto_admin_session';
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60;

export interface IAuthenticatedMockRequest {
  readonly session: IMockSession;
  readonly user: IMockUser;
}

export interface IMockApiError {
  readonly code: string;
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
}

export async function applyMockLatency(): Promise<void> {
  await delay(120);
}

export function jsonResponse<TBody extends JsonBodyType>(
  body: TBody,
  status = 200,
  headers?: HeadersInit,
): HttpResponse<TBody> {
  return HttpResponse.json(body, { status, headers });
}

export function errorResponse(
  status: number,
  code: string,
  fieldErrors?: Readonly<Record<string, readonly string[]>>,
): HttpResponse<JsonBodyType> {
  const body: IMockApiError = fieldErrors ? { code, fieldErrors } : { code };

  return HttpResponse.json<JsonBodyType>(body, { status });
}

export function getAuthenticatedRequest(
  cookies: Readonly<Record<string, string>>,
): IAuthenticatedMockRequest | undefined {
  const session = findActiveSession(cookies[SESSION_COOKIE_NAME]);

  if (session === undefined) {
    return undefined;
  }

  const user = getMockState().users.get(session.userId);

  return user === undefined ? undefined : { session, user };
}

export function hasPermission(
  authenticatedRequest: IAuthenticatedMockRequest,
  permission: AdminShellPermissionType,
): boolean {
  return getPermissions(authenticatedRequest.user.role).includes(permission);
}

export function hasValidCsrfToken(
  request: Request,
  authenticatedRequest: IAuthenticatedMockRequest,
): boolean {
  return (
    request.headers.get('X-CSRF-Token') ===
    authenticatedRequest.session.csrfToken
  );
}

export function createSessionCookie(session: IMockSession): string {
  return `${SESSION_COOKIE_NAME}=${session.id}; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * MSW cannot enforce browser cookie protections. The production backend must set
 * HttpOnly, Secure where applicable, and an appropriate SameSite policy, and it
 * must perform Origin validation, rate limiting, and audit logging.
 */
export function createExpiredSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}
