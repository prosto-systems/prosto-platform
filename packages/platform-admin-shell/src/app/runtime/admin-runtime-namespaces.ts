import * as I18n from 'vue-i18n';
import * as Pinia from 'pinia';
import * as Vue from 'vue';
import * as VueRouter from 'vue-router';
import * as VuetifyFramework from 'vuetify';
import * as VuetifyComponents from 'vuetify/components';
import * as VuetifyDirectives from 'vuetify/directives';

export const adminRuntimeNamespaces = Object.freeze({
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
