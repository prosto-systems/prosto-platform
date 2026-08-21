import type { AdminShellPermissionType } from '@prosto/platform-sdk';
import type { App } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth';
import { pinia } from './pinia';
import { installAdminShell } from './admin-shell';

describe('AdminShellRuntime', () => {
  beforeEach((): void => {
    useAuthStore(pinia).$reset();
  });

  it('denies permissions when the principal is signed out', (): void => {
    const adminShell = installAdminShell({} as App, pinia);
    let canViewDashboard = true;

    adminShell.registerPlugin('example-module', ({ auth }) => {
      canViewDashboard = auth.can('dashboard:view');
    });

    expect(canViewDashboard).toBe(false);
  });

  it('reads current permissions for every authorization check', (): void => {
    const adminShell = installAdminShell({} as App, pinia);
    const authStore = useAuthStore(pinia);
    let auth:
      { can(permission: AdminShellPermissionType): boolean } | undefined;

    adminShell.registerPlugin('example-module', (context) => {
      auth = context.auth;
    });

    authStore.$patch({
      status: 'authenticated',
      permissions: ['dashboard:view'],
    });

    expect(auth?.can('dashboard:view')).toBe(true);

    authStore.$patch({ permissions: [] });

    expect(auth?.can('dashboard:view')).toBe(false);
  });
});
