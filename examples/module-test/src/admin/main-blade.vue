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
import { bladeScopeToken, type IAdminShellBlade } from '@prosto/platform-sdk';
import { defineStore } from 'pinia';
import { computed, inject, shallowReactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useTheme } from 'vuetify';
import { VBtn, VCard, VCardText, VCardTitle } from 'vuetify/components';

const useModuleTestStore = defineStore('module-test-blade', {
  state: () => ({ isReady: true }),
});

const scope = inject(bladeScopeToken)!;

const blade = shallowReactive<IAdminShellBlade>(scope.blade);
const { locale } = useI18n();
const route = useRoute();
const store = useModuleTestStore();
const theme = useTheme();

const themeLabel = computed(() =>
  theme.global.current.value.dark ? 'dark' : 'light',
);

blade.isLoading = false;

function addBlade() {
  scope.bladeService.showBlade(
    {
      id: `blade.${blade.id}.child`,
      title: `Blade title ${blade.id}`,
      component: {
        template: '<div>child</div>',
      },
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
