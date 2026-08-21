import { createI18n } from 'vue-i18n';
import { readPersistedLocale } from '@/features/preferences';
import { messages } from '../locales';

const initialLocale: string = readPersistedLocale();

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages,
});

export type I18nType = typeof i18n;
