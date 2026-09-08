import type { SupportedLocaleType } from '@prosto/platform-sdk/admin';
import { enMessages } from './en.ts';
import { ruMessages } from './ru.ts';

export const messages: Record<SupportedLocaleType, Record<string, unknown>> = {
  en: enMessages,
  ru: ruMessages,
};
