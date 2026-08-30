import AdminBlade from './admin-blade.vue';
import { defineStore } from 'pinia';
import { createI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

export function registerAdminPlugin(): void {
  void AdminBlade;
  void createI18n;
  void defineStore;
  void useRouter;
}
