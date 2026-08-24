<template>
  <MainLayout>
    <router-view />
  </MainLayout>
</template>

<script lang="ts" setup>
import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import { MainLayout } from './layouts';
import { useAuthStore } from '@/features/auth';
import { usePlatform } from '@/features/platform';
import { usePreferencesStore } from '@/features/preferences';
import { useAdminShell } from '@/shared/shell';

const authStore = useAuthStore();
const preferencesStore = usePreferencesStore();
const { isAuthenticated, csrfToken } = storeToRefs(authStore);
const { locale } = storeToRefs(preferencesStore);

const adminShell = useAdminShell();
const { manifest, loadManifest, loadPlugins } = usePlatform();

function getCsrfToken(): string {
  if (!csrfToken.value) {
    throw new Error('The current session has no CSRF token.');
  }

  return csrfToken.value;
}

async function loadAdminShellPlugins(): Promise<void> {
  await loadManifest(getCsrfToken());
  await loadPlugins(manifest.data.value?.plugins || []);

  console.debug(adminShell.plugins);
}

watch(
  isAuthenticated,
  () => {
    if (isAuthenticated.value && !manifest.data.value) {
      loadAdminShellPlugins();
    }
  },
  { immediate: true },
);

watch(
  locale,
  (currentLocale) => {
    document.documentElement.lang = currentLocale;
  },
  { immediate: true },
);
</script>
