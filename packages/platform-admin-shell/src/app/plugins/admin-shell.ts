import { ADMIN_SHELL_GLOBAL, type IAdminShell } from '@prosto/platform-sdk';
import type { App } from 'vue';
import type { Pinia } from 'pinia';
import { AdminShell } from '@/app/shell';

export function installAdminShell(app: App, pinia: Pinia): IAdminShell {
  const adminShell = new AdminShell(pinia);

  globalThis[ADMIN_SHELL_GLOBAL] = adminShell;

  return adminShell;
}
