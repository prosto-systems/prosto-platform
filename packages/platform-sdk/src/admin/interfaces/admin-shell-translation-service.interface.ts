export type SupportedLocaleType = 'en' | 'ru';

export type LocalizedMessageType<T> = T extends string
  ? string
  : { [K in keyof T]: LocalizedMessageType<T[K]> };

export interface IAdminShellTranslationService {
  registerLocaleMessages: (
    messages: Record<SupportedLocaleType, Record<string, unknown>>,
  ) => void;
}
