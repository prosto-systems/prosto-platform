import type { IAdminShell } from './interfaces/admin-shell.interface.js';
import type { IAdminShellRuntime } from './interfaces/admin-shell-runtime.interface.js';

export {};

declare global {
  /**
   * @alpha
   * The admin shell runtime exposed to platform module assets.
   */
  var __PROSTO_ADMIN_SHELL__: IAdminShell;

  /**
   * @alpha
   * Shared Vue ecosystem runtime exposed by the admin shell when available.
   */
  var __PROSTO_ADMIN_RUNTIME__: IAdminShellRuntime | undefined;
}
