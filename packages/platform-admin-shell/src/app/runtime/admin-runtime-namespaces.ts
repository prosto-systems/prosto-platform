import * as I18n from 'vue-i18n';
import * as Pinia from 'pinia';
import * as Vue from 'vue';
import * as VueRouter from 'vue-router';
import * as VuetifyFramework from 'vuetify';
import * as VuetifyComponents from 'vuetify/components';
import * as VuetifyDirectives from 'vuetify/directives';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const adminRuntimeNamespaces: Readonly<{
  vue: Readonly<Record<string, any>>;
  i18n: Readonly<Record<string, any>>;
  pinia: Readonly<Record<string, any>>;
  vueRouter: Readonly<Record<string, any>>;
  vuetify: Readonly<{
    framework: Readonly<Record<string, any>>;
    components: Readonly<Record<string, any>>;
    directives: Readonly<Record<string, any>>;
  }>;
}> = Object.freeze({
  vue: Vue,
  i18n: I18n,
  pinia: Pinia,
  vueRouter: VueRouter,
  vuetify: Object.freeze({
    framework: VuetifyFramework,
    components: VuetifyComponents,
    directives: VuetifyDirectives,
  }),
});
