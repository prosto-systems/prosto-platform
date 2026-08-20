import { createI18n } from 'vue-i18n';

const messages = {
  en: {
    message: {
      hello: 'hello world',
    },
  },
};

export default createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages,
});
