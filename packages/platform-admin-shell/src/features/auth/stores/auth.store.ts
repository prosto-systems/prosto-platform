import type {
  AdminShellPermissionType,
  AuthSessionType,
  LoginRequestType,
  PasswordResetRequestType,
  PasswordResetType,
} from '@prosto/platform-sdk/admin';
import { defineStore } from 'pinia';
import { ApiError } from '@/shared/api';
import { authApi } from '../api';

export type AuthStatusType =
  'unknown' | 'loading' | 'authenticated' | 'anonymous';

export interface IAuthPrincipal {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: 'admin' | 'operator' | 'viewer';
}

interface IAuthState {
  status: AuthStatusType;
  principal: IAuthPrincipal | null;
  isAuthenticated: boolean;
  permissions: readonly AdminShellPermissionType[];
  csrfToken: string | null;
  error: ApiError | null;
}

const initializationRequests = new WeakMap<object, Promise<void>>();

export const useAuthStore = defineStore('auth', {
  state: (): IAuthState => ({
    status: 'unknown',
    principal: null,
    isAuthenticated: false,
    permissions: [],
    csrfToken: null,
    error: null,
  }),

  actions: {
    async resolveInitialState(): Promise<void> {
      if (this.status === 'authenticated' || this.status === 'anonymous') {
        return;
      }

      const pendingRequest = initializationRequests.get(this);

      if (pendingRequest) {
        return pendingRequest;
      }

      this.status = 'loading';
      this.error = null;

      const request = authApi
        .restoreSession()
        .then((session) => this._setSession(session))
        .catch((error: unknown) => {
          this.invalidate();

          if (!(error instanceof ApiError) || error.status !== 401) {
            this.error = this._toApiError(error);
          }
        })
        .finally(() => initializationRequests.delete(this));

      initializationRequests.set(this, request);

      return request;
    },

    async login(request: LoginRequestType): Promise<void> {
      this.status = 'loading';
      this.error = null;

      try {
        this._setSession(await authApi.login(request));
      } catch (error: unknown) {
        this.invalidate();
        this.error = this._toApiError(error);
        throw this.error;
      }
    },

    async logout(): Promise<void> {
      const csrfToken = this.csrfToken;

      if (csrfToken === null) {
        this.invalidate();
        return;
      }

      await authApi.logout(csrfToken);

      this.invalidate();
    },

    async requestPasswordReset(
      request: PasswordResetRequestType,
    ): Promise<void> {
      this.error = null;

      try {
        await authApi.requestPasswordReset(request);
      } catch (error: unknown) {
        this.error = this._toApiError(error);
        throw this.error;
      }
    },

    async completePasswordReset(request: PasswordResetType): Promise<void> {
      this.error = null;

      try {
        await authApi.completePasswordReset(request);
      } catch (error: unknown) {
        this.error = this._toApiError(error);
        throw this.error;
      }
    },

    invalidate(): void {
      this.status = 'anonymous';
      this.isAuthenticated = false;
      this.principal = null;
      this.permissions = [];
      this.csrfToken = null;
    },

    can(permission: AdminShellPermissionType): boolean {
      return (
        this.status === 'authenticated' && this.permissions.includes(permission)
      );
    },

    _setSession(session: AuthSessionType): void {
      this.csrfToken = session.csrfToken;
      this.permissions = session.permissions.map(
        (permission) => permission as AdminShellPermissionType,
      );
      this.principal = session.principal;
      this.status = 'authenticated';
      this.isAuthenticated = true;
      this.error = null;
    },

    _toApiError(error: unknown): ApiError {
      if (error instanceof ApiError) {
        return error;
      }

      return new ApiError({ status: 0, code: 'request_failed' });
    },
  },
});
