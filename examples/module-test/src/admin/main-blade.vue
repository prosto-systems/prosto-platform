<template>
  <VCard class="module-test-card ma-2">
    <VCardTitle>Shared Vuetify runtime</VCardTitle>
    <VCardText>
      <p class="module-test-card__detail">Blade: {{ blade.id }}</p>
      <p class="module-test-card__detail">Shell theme: {{ themeLabel }}</p>
      <p class="module-test-card__detail">Locale: {{ locale }}</p>
      <p class="module-test-card__detail">Route: {{ route.path }}</p>
      <p class="module-test-card__detail">Pinia store: {{ store.isReady }}</p>
      <VBtn color="primary" @click="addBlade">Add blade</VBtn>
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import { type IAdminShellBlade, useBladeScope } from '@prosto/platform-sdk';
import { defineStore } from 'pinia';
import { computed, shallowReactive, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useTheme } from 'vuetify';
import SecondBlade from './second-blade.vue';

interface IEmits {
  close: [];
}

const emit = defineEmits<IEmits>();

const useModuleTestStore = defineStore('module-test-blade', {
  state: () => ({ isReady: true }),
});

const scope = useBladeScope();
const theme = useTheme();
const route = useRoute();
const { locale } = useI18n();
const store = useModuleTestStore();

const blade = shallowReactive<IAdminShellBlade>(scope.blade);
const flag = shallowRef(true);

const themeLabel = computed(() =>
  theme.global.current.value.dark ? 'dark' : 'light',
);

blade.toolbarCommands = [
  {
    name: 'Back',
    title: 'Tooltip',
    icon: 'mdi-arrow-left',
    showSeparator: true,
    action: () => {
      emit('close');
    },
  },
  {
    name: 'Refresh',
    title: 'Tooltip',
    icon: 'mdi-refresh',
    action: () => {
      flag.value = !flag.value;
    },
  },
  {
    name: 'Add',
    title: 'Tooltip',
    icon: 'mdi-plus',
    action: () => addBlade(),
  },
  {
    name: 'Remove',
    title: 'Tooltip',
    icon: 'mdi-delete-outline',
    isDisabled: () => flag.value,
    action: () => {
      blade.size = 'large';
    },
  },
];

blade.isLoading = false;

function addBlade() {
  scope.bladeService.showBlade(
    {
      id: `blade.${blade.id}.child`,
      title: `Blade title ${blade.id}`,
      size: 'large',
      component: SecondBlade,
    },
    blade,
  );
}
</script>

<style scoped lang="scss">
.module-test-card {
  max-width: 32rem;

  &__detail {
    margin-bottom: 0.75rem;
  }
}
</style>
