<template>
  <v-snackbar
    v-model="isVisible"
    :timeout="-1"
    color="warning"
    location="bottom end"
    role="status"
  >
    <div class="plugin-load-alert">
      <span>{{ t('plugins.loadFailed') }}</span>
      <span class="plugin-load-alert__modules">
        {{ failedPluginIds.join(', ') }}
      </span>
    </div>

    <template #actions>
      <v-btn :aria-label="t('plugins.dismiss')" variant="text" @click="dismiss">
        {{ t('plugins.dismiss') }}
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PluginLoadFailureCodeType } from '../models';

interface IPluginLoadFailure {
  readonly moduleId: string;
  readonly code: PluginLoadFailureCodeType;
}

interface IProps {
  readonly failedPlugins: readonly IPluginLoadFailure[];
}

const props = defineProps<IProps>();

const { t } = useI18n();
const isVisible = shallowRef(false);

const failedPluginIds = computed(() =>
  props.failedPlugins.map((plugin) => plugin.moduleId),
);

watch(
  () =>
    props.failedPlugins.map((plugin) => `${plugin.moduleId}:${plugin.code}`),
  (failures) => {
    if (failures.length > 0) {
      isVisible.value = true;
    }
  },
  { immediate: true },
);

function dismiss(): void {
  isVisible.value = false;
}
</script>

<style scoped>
.plugin-load-alert {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.plugin-load-alert__modules {
  font-weight: 700;
}
</style>
