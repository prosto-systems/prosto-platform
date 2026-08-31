import type { LocalizedMessageType } from '@prosto/platform-sdk';
import type { enMessages } from './en';

type PluginMessagesType = LocalizedMessageType<typeof enMessages>;

export const ruMessages: PluginMessagesType = {
  module_test: {
    main_blade: {
      title: 'Модуль Тест',
    },
  },
};
