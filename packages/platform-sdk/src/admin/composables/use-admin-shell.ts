import type { IAdminShell } from '../interfaces/index.js';
import { ADMIN_SHELL_GLOBAL } from '../constants/index.js';

export function useAdminShell(): IAdminShell {
  const adminShell = globalThis[ADMIN_SHELL_GLOBAL];

  if (!adminShell) {
    throw new ReferenceError(
      `[PlatformSDK::useAdminShell] "${ADMIN_SHELL_GLOBAL}" is not supported`,
    );
  }

  return adminShell;
}
