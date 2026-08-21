import type { IAdminShell } from './interfaces/admin-shell.interface.js';

export {};

declare global {
  /**
   * The admin shell runtime exposed to platform module assets.
   */
  var __PROSTO_ADMIN_SHELL__: IAdminShell;
}
