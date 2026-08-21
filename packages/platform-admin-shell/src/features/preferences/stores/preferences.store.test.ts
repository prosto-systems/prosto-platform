import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, DEFAULT_THEME_PREFERENCE } from '../models';
import { usePreferencesStore } from './preferences.store';

describe('preferences store', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('falls back to English and system theme for invalid persisted values', () => {
    localStorage.setItem('prosto.admin.locale', 'de');
    localStorage.setItem('prosto.admin.theme', 'contrast');

    const preferencesStore = usePreferencesStore();

    expect(preferencesStore.locale).toBe(DEFAULT_LOCALE);
    expect(preferencesStore.theme).toBe(DEFAULT_THEME_PREFERENCE);
  });

  it('persists only locale and theme preference selections', () => {
    const preferencesStore = usePreferencesStore();

    preferencesStore.setLocale('ru');
    preferencesStore.setTheme('dark');

    expect(preferencesStore.locale).toBe('ru');
    expect(preferencesStore.theme).toBe('dark');
    expect(localStorage.getItem('prosto.admin.locale')).toBe('ru');
    expect(localStorage.getItem('prosto.admin.theme')).toBe('dark');
    expect(localStorage.getItem('prosto.admin.session')).toBeNull();
  });
});
