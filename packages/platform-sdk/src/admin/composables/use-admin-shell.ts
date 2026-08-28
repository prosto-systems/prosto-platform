import type { IAdminShell } from '@prosto/platform-sdk';

export function useAdminShell(): IAdminShell {
  const adminShell = globalThis.__PROSTO_ADMIN_SHELL__;

  if (!adminShell) {
    throw new ReferenceError(
      '[AdminShell::useAdminShell] "__POSTO_ADMIN_SHELL__" is not supported',
    );
  }

  return adminShell;
}
