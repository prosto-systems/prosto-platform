import type { SupportedLocaleType } from '@prosto/platform-sdk';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import {
  persistLocale,
  persistThemePreference,
  readPersistedLocale,
  readPersistedThemePreference,
  type ThemePreferenceType,
} from '../models';

export const usePreferencesStore = defineStore('preferences', () => {
  const locale = shallowRef<SupportedLocaleType>(readPersistedLocale());
  const theme = shallowRef<ThemePreferenceType>(readPersistedThemePreference());

  function setLocale(nextLocale: SupportedLocaleType): void {
    locale.value = nextLocale;
    persistLocale(nextLocale);
  }

  function setTheme(nextTheme: ThemePreferenceType): void {
    theme.value = nextTheme;
    persistThemePreference(nextTheme);
  }

  return { locale, theme, setLocale, setTheme };
});
