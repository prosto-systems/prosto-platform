import type {
  AuthSessionType,
  LoginRequestType,
  PasswordResetRequestType,
  PasswordResetType,
} from '../models';
import {
  authSessionSchema,
  loginRequestSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  resetRequestAcceptedSchema,
} from '../models';
import { csrfHeaders, httpClient } from '@/shared/api';

class AuthApi {
  async login(request: LoginRequestType): Promise<AuthSessionType> {
    const payload = loginRequestSchema.parse(request);

    return httpClient.request('/api/admin/auth/login', {
      body: payload,
      method: 'POST',
      responseSchema: authSessionSchema,
    });
  }

  async restoreSession(): Promise<AuthSessionType> {
    return httpClient.request('/api/admin/auth/session', {
      responseSchema: authSessionSchema,
    });
  }

  async logout(csrfToken: string): Promise<void> {
    await httpClient.request('/api/admin/auth/logout', {
      headers: csrfHeaders(csrfToken),
      method: 'POST',
    });
  }

  async requestPasswordReset(request: PasswordResetRequestType): Promise<void> {
    const payload = passwordResetRequestSchema.parse(request);

    await httpClient.request('/api/admin/auth/password-reset-requests', {
      body: payload,
      method: 'POST',
      responseSchema: resetRequestAcceptedSchema,
    });
  }

  async completePasswordReset(request: PasswordResetType): Promise<void> {
    const payload = passwordResetSchema.parse(request);

    await httpClient.request('/api/admin/auth/password-resets', {
      body: payload,
      method: 'POST',
      responseSchema: resetRequestAcceptedSchema,
    });
  }
}

export const authApi = new AuthApi();
