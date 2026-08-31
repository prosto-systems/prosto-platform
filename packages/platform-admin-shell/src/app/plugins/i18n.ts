import {
  supportedLocales,
  type SupportedLocaleType,
} from '@prosto/platform-sdk';
import { createI18n } from 'vue-i18n';
import { readPersistedLocale } from '@/features/preferences';
import { messages as localeMessages } from '../locales';

const initialLocale: string = readPersistedLocale();

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: localeMessages,
});

export type I18nType = typeof i18n;

export function registerLocaleMessages(
  messages: Record<SupportedLocaleType, Record<string, unknown>>,
): void {
  for (const locale of supportedLocales) {
    i18n.global.mergeLocaleMessage(locale, messages[locale]);

    console.debug(
      `[I18n::registerLocaleMessages] Locale: ${locale}`,
      `Messages:`,
      messages[locale],
    );
  }
}
