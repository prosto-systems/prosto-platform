import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import {
  persistLocale,
  persistThemePreference,
  readPersistedLocale,
  readPersistedThemePreference,
  type ApplicationLocaleType,
  type ThemePreferenceType,
} from '../models';

export const usePreferencesStore = defineStore('preferences', () => {
  const locale = shallowRef<ApplicationLocaleType>(readPersistedLocale());
  const theme = shallowRef<ThemePreferenceType>(readPersistedThemePreference());

  function setLocale(nextLocale: ApplicationLocaleType): void {
    locale.value = nextLocale;
    persistLocale(nextLocale);
  }

  function setTheme(nextTheme: ThemePreferenceType): void {
    theme.value = nextTheme;
    persistThemePreference(nextTheme);
  }

  return { locale, theme, setLocale, setTheme };
});
