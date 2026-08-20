import type { App } from 'vue';
import { createPinia } from 'pinia';
import vuetify from './vuetify.ts';
import router from '../router';
import i18n from './i18n.ts';

export function registerPlugins(app: App) {
  app.use(vuetify);
  app.use(createPinia());
  app.use(i18n);
  app.use(router);
}
