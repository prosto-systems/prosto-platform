import { z } from 'zod';
import {
  supportedLocales,
  type SupportedLocaleType,
} from '@prosto/platform-sdk';

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;

export type ThemePreferenceType = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_LOCALE: SupportedLocaleType = 'en';
export const DEFAULT_THEME_PREFERENCE: ThemePreferenceType = 'system';

const localeSchema = z.enum(supportedLocales);
const themePreferenceSchema = z.enum(THEME_PREFERENCES);

const LOCALE_STORAGE_KEY = 'prosto.admin.locale';
const THEME_STORAGE_KEY = 'prosto.admin.theme';

function readPreference<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    return schema.catch(fallback).parse(localStorage?.getItem(key));
  } catch {
    return fallback;
  }
}

function persistPreference(key: string, value: string): void {
  try {
    localStorage?.setItem(key, value);
  } catch {
    // Storage can be disabled by browser privacy settings. Preferences remain in memory.
  }
}

export function readPersistedLocale(): SupportedLocaleType {
  return readPreference(LOCALE_STORAGE_KEY, localeSchema, DEFAULT_LOCALE);
}

export function readPersistedThemePreference(): ThemePreferenceType {
  return readPreference(
    THEME_STORAGE_KEY,
    themePreferenceSchema,
    DEFAULT_THEME_PREFERENCE,
  );
}

export function persistLocale(locale: SupportedLocaleType): void {
  persistPreference(LOCALE_STORAGE_KEY, locale);
}

export function persistThemePreference(theme: ThemePreferenceType): void {
  persistPreference(THEME_STORAGE_KEY, theme);
}
