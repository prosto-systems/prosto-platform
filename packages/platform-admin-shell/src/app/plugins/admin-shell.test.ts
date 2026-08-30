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

  it('denies permissions when the principal is signed out', async (): Promise<void> => {
    const adminShell = installAdminShell({} as App, pinia);
    let canViewDashboard = true;

    await adminShell.registerPlugin('example-module', ({ authService }) => {
      canViewDashboard = authService.can('dashboard:view');
    });

    expect(canViewDashboard).toBe(false);
  });

  it('reads current permissions for every authorization check', async (): Promise<void> => {
    const adminShell = installAdminShell({} as App, pinia);
    const authStore = useAuthStore(pinia);
    let auth:
      { can(permission: AdminShellPermissionType): boolean } | undefined;

    await adminShell.registerPlugin('example-module', (context) => {
      auth = context.authService;
    });

    authStore.$patch({
      status: 'authenticated',
      permissions: ['dashboard:view'],
    });

    expect(auth?.can('dashboard:view')).toBe(true);

    authStore.$patch({ permissions: [] });

    expect(auth?.can('dashboard:view')).toBe(false);
  });

  it('does not report registration before an asynchronous callback completes', async (): Promise<void> => {
    const adminShell = installAdminShell({} as App, pinia);
    let completeRegistration: (() => void) | undefined;
    const registration = adminShell.registerPlugin(
      'async-module',
      () =>
        new Promise<void>((resolve) => {
          completeRegistration = resolve;
        }),
    );

    expect(adminShell.plugins).not.toContain('async-module');

    completeRegistration?.();
    await registration;

    expect(adminShell.plugins).toContain('async-module');
  });

  it('rejects a duplicate or in-progress registration', async (): Promise<void> => {
    const adminShell = installAdminShell({} as App, pinia);
    let completeRegistration: (() => void) | undefined;
    const registration = adminShell.registerPlugin(
      'duplicate-module',
      () =>
        new Promise<void>((resolve) => {
          completeRegistration = resolve;
        }),
    );

    await expect(
      adminShell.registerPlugin('duplicate-module', () => undefined),
    ).rejects.toThrow("Admin plugin already registered: 'duplicate-module'.");

    completeRegistration?.();
    await registration;

    await expect(
      adminShell.registerPlugin('duplicate-module', () => undefined),
    ).rejects.toThrow("Admin plugin already registered: 'duplicate-module'.");
  });
});
