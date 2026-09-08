import type { AuthSessionType } from '@prosto/platform-sdk/admin';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api';
import { authApi } from '../api';
import { useAuthStore } from './auth.store';

const session: AuthSessionType = {
  csrfToken: 'csrf-token',
  permissions: ['dashboard:view'],
  principal: {
    displayName: 'Ada Admin',
    email: 'ada@example.test',
    id: 'user-1',
    role: 'admin' as const,
  },
};

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('restores a session once for concurrent initialization requests', async () => {
    const restoreSession = vi
      .spyOn(authApi, 'restoreSession')
      .mockResolvedValue(session);

    const authStore = useAuthStore();

    await Promise.all([
      authStore.resolveInitialState(),
      authStore.resolveInitialState(),
    ]);

    expect(restoreSession).toHaveBeenCalledTimes(1);
    expect(authStore.status).toBe('authenticated');
    expect(authStore.principal?.email).toBe('ada@example.test');
    expect(authStore.can('dashboard:view')).toBe(true);
  });

  it('clears sensitive in-memory state when the session is unauthorized', async () => {
    vi.spyOn(authApi, 'restoreSession').mockRejectedValue(
      new ApiError({ status: 401, code: 'unauthorized' }),
    );

    const authStore = useAuthStore();

    await authStore.resolveInitialState();

    expect(authStore.status).toBe('anonymous');
    expect(authStore.principal).toBeNull();
    expect(authStore.permissions).toEqual([]);
    expect(authStore.csrfToken).toBeNull();
  });
});
