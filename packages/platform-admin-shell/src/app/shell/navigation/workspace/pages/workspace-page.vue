<template>
  <div>{{ $route.name }}</div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { onBeforeRouteUpdate, useRoute } from 'vue-router';

const route = useRoute();

const onMountedCallback = route.meta.on?.mounted;
let onUnmountedCallback = route.meta.on?.unmounted;

onBeforeRouteUpdate(async (to, from) => {
  /**
   * Since the `WorkspacePage` component is reused when switching from one
   * workspace to another, we have to use the current logic in `onBeforeRouteUpdate`.
   */
  await from.meta.on?.unmounted?.();
  await to.meta.on?.mounted?.();

  onUnmountedCallback = to.meta.on?.unmounted;
});

onMounted(() => onMountedCallback?.());
onUnmounted(() => onUnmountedCallback?.());
</script>
