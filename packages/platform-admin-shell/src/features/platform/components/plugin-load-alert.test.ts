import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { describe, expect, it } from 'vitest';
import { messages } from '@/app/locales';
import PluginLoadAlert from './plugin-load-alert.vue';

const snackbarStub = {
  props: {
    modelValue: { type: Boolean, required: true },
  },
  template: '<div v-if="modelValue"><slot /><slot name="actions" /></div>',
};

const buttonStub = {
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
};

function mountAlert(
  failedPlugins: readonly {
    readonly moduleId: string;
    readonly code: 'entry_import_failed' | 'registration_failed';
  }[],
  locale = 'en',
) {
  const i18n = createI18n({
    legacy: false,
    locale,
    messages,
  });

  return mount(PluginLoadAlert, {
    props: { failedPlugins },
    global: {
      plugins: [i18n],
      stubs: {
        VBtn: buttonStub,
        VSnackbar: snackbarStub,
      },
    },
  });
}

describe('PluginLoadAlert', () => {
  it('does not render an alert when every plugin loads', (): void => {
    const wrapper = mountAlert([]);

    expect(wrapper.text()).toBe('');
  });

  it('summarizes multiple failures and can be dismissed', async (): Promise<void> => {
    const wrapper = mountAlert([
      { moduleId: 'billing', code: 'entry_import_failed' },
      { moduleId: 'reporting', code: 'registration_failed' },
    ]);

    expect(wrapper.text()).toContain('Some admin plugins could not be loaded:');
    expect(wrapper.text()).toContain('billing, reporting');

    await wrapper.get('button').trigger('click');

    expect(wrapper.text()).toBe('');
  });

  it('uses the Russian localized message', (): void => {
    const wrapper = mountAlert(
      [{ moduleId: 'billing', code: 'entry_import_failed' }],
      'ru',
    );

    expect(wrapper.text()).toContain(
      'Не удалось загрузить некоторые плагины администрирования:',
    );
    expect(wrapper.text()).toContain('Закрыть');
  });
});
