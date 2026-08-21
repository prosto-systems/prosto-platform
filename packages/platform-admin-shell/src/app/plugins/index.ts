import type { App } from 'vue';
import { router } from '../router';
import { installAdminShell } from './admin-shell';
import { i18n } from './i18n';
import { pinia } from './pinia';
import { vuetify } from './vuetify';

export * from './i18n';
export * from './pinia';

export function installApplicationPlugins(app: App): void {
  app.use(installAdminShell, pinia);
  app.use(pinia);
  app.use(i18n);
  app.use(vuetify);
  app.use(router);
}
