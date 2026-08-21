<template>
  <MainLayout>
    <router-view />
  </MainLayout>
</template>

<script lang="ts" setup>
import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import { MainLayout } from './layouts';
import { usePreferencesStore } from '@/features/preferences';

const preferencesStore = usePreferencesStore();
const { locale } = storeToRefs(preferencesStore);

watch(
  locale,
  (currentLocale) => {
    document.documentElement.lang = currentLocale;
  },
  { immediate: true },
);
</script>
