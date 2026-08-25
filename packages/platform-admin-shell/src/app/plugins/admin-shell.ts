import type { IAdminShell } from '@prosto/platform-sdk';
import type { App } from 'vue';
import type { Pinia } from 'pinia';
import { AdminShell } from '@/app/shell';

export function installAdminShell(app: App, pinia: Pinia): IAdminShell {
  const adminShell = new AdminShell(pinia);

  globalThis.__PROSTO_ADMIN_SHELL__ = adminShell;

  return adminShell;
}
