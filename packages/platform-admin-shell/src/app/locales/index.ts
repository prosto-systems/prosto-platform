import type { SupportedLocaleType } from '@prosto/platform-sdk';
import { enMessages } from './en';
import { ruMessages } from './ru';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const messages: Record<SupportedLocaleType, Record<string, any>> = {
  en: enMessages,
  ru: ruMessages,
};
