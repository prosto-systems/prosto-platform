import { createVuetify, type VuetifyOptions } from 'vuetify';
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import { useI18n } from 'vue-i18n';
import { readPersistedThemePreference } from '@/features/preferences';
import { adminRuntimeNamespaces } from '../runtime';
import { i18n } from './i18n';

import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

export const vuetifyOptions: VuetifyOptions = {
  directives: adminRuntimeNamespaces.vuetify.directives,
  components: adminRuntimeNamespaces.vuetify.components,
  locale: {
    adapter: createVueI18nAdapter({ i18n, useI18n }),
  },
  theme: {
    defaultTheme: readPersistedThemePreference(),
    themes: {
      light: {
        dark: false,
        colors: {
          // background: '#f6f8fb',
          // surface: '#ffffff',
          // 'surface-variant': '#e8edf5',
          // 'on-surface-variant': '#314155',
          primary: '#005bbb',
          'on-primary': '#ffffff',
          // success: '#166534',
          // 'on-success': '#ffffff',
          // warning: '#9a4d00',
          // 'on-warning': '#ffffff',
          // error: '#c62828',
          // 'on-error': '#ffffff',
          // info: '#075985',
          // 'on-info': '#ffffff',
        },
      },
      dark: {
        dark: true,
        colors: {
          // background: '#10151d',
          // surface: '#19222e',
          // 'surface-variant': '#263545',
          // 'on-surface-variant': '#c5d2e1',
          primary: '#7cb8ff',
          'on-primary': '#002c5d',
          // success: '#4ade80',
          // 'on-success': '#062b18',
          // warning: '#fbbf24',
          // 'on-warning': '#3b2200',
          // error: '#fca5a5',
          // 'on-error': '#4a0909',
          // info: '#7dd3fc',
          // 'on-info': '#082f49',
        },
      },
    },
  },
};

export const vuetify = createVuetify(vuetifyOptions);
