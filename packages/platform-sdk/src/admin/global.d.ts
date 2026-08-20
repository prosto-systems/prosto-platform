import type { IAdminShell } from './interfaces/admin-shell.interface.js';

export {};

declare global {
  var adminShell: IAdminShell;
}
