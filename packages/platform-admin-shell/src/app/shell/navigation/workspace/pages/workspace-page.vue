<template>
  <blades-container />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { onBeforeRouteUpdate, useRoute } from 'vue-router';
import { BladesContainer, useBladesStore } from '@/app/shell';

const route = useRoute();
const bladesStore = useBladesStore();

const onMountedCallback = route.meta.on?.mounted;
let onUnmountedCallback = route.meta.on?.unmounted;
let unmountedWorkspace = route.name;

/**
 * Since the `WorkspacePage` component is reused when switching from one
 * workspace to another, we have to use the current logic in `onMounted`, `onBeforeRouteUpdate` and `onUnmounted`.
 */
onMounted(() => onMountedCallback?.());
onBeforeRouteUpdate(async (to, from) => {
  await from.meta.on?.unmounted?.();
  await bladesStore.resetWorkspaceBlades(from.name);
  await to.meta.on?.mounted?.();

  onUnmountedCallback = to.meta.on?.unmounted;
  unmountedWorkspace = to.name;
});
onUnmounted(async () => {
  await onUnmountedCallback?.();
  await bladesStore.resetWorkspaceBlades(unmountedWorkspace);
});
</script>
