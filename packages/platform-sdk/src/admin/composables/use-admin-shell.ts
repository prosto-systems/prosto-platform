import type { IAdminShell } from '@prosto/platform-sdk';
import { ADMIN_SHELL_GLOBAL } from '../constants/index.js';

export function useAdminShell(): IAdminShell {
  const adminShell = globalThis[ADMIN_SHELL_GLOBAL];

  if (!adminShell) {
    throw new ReferenceError(
      `[AdminShell::useAdminShell] "${ADMIN_SHELL_GLOBAL}" is not supported`,
    );
  }

  return adminShell;
}
