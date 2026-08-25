import type { AuthSessionType } from '@/features/auth';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { getMockState, reloadMockStateFromStorage } from '../mock-state';
import { server } from '../server';

const API_URL = 'http://localhost/api/admin';

interface IErrorResponse {
  readonly code: string;
}

interface IRequestResult<TBody> {
  readonly response: Response;
  readonly body: TBody | undefined;
}

async function loginAsAdmin(): Promise<IRequestResult<AuthSessionType>> {
  return request<AuthSessionType>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@prosto.test',
      password: 'Admin123!',
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

async function request<TBody = undefined>(
  path: string,
  options: RequestInit = {},
): Promise<IRequestResult<TBody>> {
  const response = await fetch(`${API_URL}${path}`, options);
  const body =
    response.status === 204 ? undefined : ((await response.json()) as TBody);

  return { response, body };
}

describe('MSW authentication handlers', () => {
  it.each([
    ['admin@prosto.test', 'Admin123!', 'maintenance:manage'],
    ['operator@prosto.test', 'Operator123!', 'platform:restart'],
    ['viewer@prosto.test', 'Viewer123!', 'dashboard:view'],
  ])('authenticates the %s demo user', async (email, password, permission) => {
    const result = await request<AuthSessionType>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(result.response.status).toBe(200);
    expect(result.body?.permissions).toContain(permission);
  });

  it('restores a session using its cookie and rejects invalid credentials', async () => {
    await loginAsAdmin();
    const session = await request<AuthSessionType>('/auth/session');
    const invalidLogin = await request<IErrorResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@prosto.test',
        password: 'incorrect-password',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(session.response.status).toBe(200);
    expect(session.body?.principal.email).toBe('admin@prosto.test');
    expect(invalidLogin.response.status).toBe(401);
    expect(invalidLogin.body).toEqual({ code: 'invalid_credentials' });
  });

  it('restores a persisted session after the mock runtime is recreated', async () => {
    const login = await loginAsAdmin();

    reloadMockStateFromStorage();
    const restoredSession = await request<AuthSessionType>('/auth/session');

    expect(restoredSession.response.status).toBe(200);
    expect(restoredSession.body).toEqual(login.body);
    expect(getMockState().sessions.size).toBe(1);
  });

  it('expires a stale session cookie when restoration fails', async () => {
    document.cookie = 'prosto_admin_session=missing; Path=/; SameSite=Lax';

    const expiredSession = await request<IErrorResponse>('/auth/session');

    expect(expiredSession.response.status).toBe(401);
    expect(expiredSession.body).toEqual({ code: 'session_expired' });
    expect(document.cookie).not.toContain('prosto_admin_session=');
  });

  it('enforces CSRF protection and expires the session cookie on logout', async () => {
    const login = await loginAsAdmin();
    const rejectedLogout = await request<IErrorResponse>('/auth/logout', {
      method: 'POST',
    });
    const logout = await request('/auth/logout', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': login.body?.csrfToken ?? '',
      },
    });

    reloadMockStateFromStorage();
    const expiredSession = await request<IErrorResponse>('/auth/session');

    expect(rejectedLogout.body).toEqual({ code: 'csrf_invalid' });
    expect(logout.response.status).toBe(204);
    expect(expiredSession.body).toEqual({ code: 'session_expired' });
    expect(getMockState().sessions.size).toBe(0);
  });

  it('keeps reset requests neutral and invalidates a used reset token', async () => {
    const unknownAccount = await request('/auth/password-reset-requests', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody@prosto.test' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const reset = await request('/auth/password-resets', {
      method: 'POST',
      body: JSON.stringify({
        token: 'reset-admin-token',
        password: 'Changed123!',
        passwordConfirmation: 'Changed123!',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const reusedToken = await request<IErrorResponse>('/auth/password-resets', {
      method: 'POST',
      body: JSON.stringify({
        token: 'reset-admin-token',
        password: 'Changed123!',
        passwordConfirmation: 'Changed123!',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const changedPasswordLogin = await request<AuthSessionType>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@prosto.test',
        password: 'Changed123!',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(unknownAccount.response.status).toBe(200);
    expect(reset.response.status).toBe(200);
    expect(reusedToken.body).toEqual({ code: 'reset_token_invalid' });
    expect(changedPasswordLogin.response.status).toBe(200);
  });

  it('allows tests to replace happy-path handlers with failure responses', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json({ code: 'server_error' }, { status: 500 }),
      ),
    );

    const result = await loginAsAdmin();

    expect(result.response.status).toBe(500);
    expect(result.body).toEqual({ code: 'server_error' });
  });
});
