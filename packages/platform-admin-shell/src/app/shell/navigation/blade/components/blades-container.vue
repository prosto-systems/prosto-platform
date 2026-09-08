<template>
  <div class="blade-container">
    <blade-item
      v-for="blade in blades"
      :id="blade.id"
      :key="blade.id"
      :blade="blade"
    />
  </div>
</template>

<script setup lang="ts">
import type { IAdminShellBlade } from '@prosto/platform-sdk/admin';
import { computed } from 'vue';
import { useBladesStore } from '@/app/shell';
import BladeItem from './blade-item.vue';

const bladeStore = useBladesStore();

const blades = computed<IAdminShellBlade[]>(() => bladeStore.workspaceBlades());
</script>

<style scoped lang="scss">
.blade-container {
  width: 100%;
  height: 100%;
  overflow-x: auto;
  white-space: nowrap;
  position: relative;
  z-index: 69;
}
</style>
