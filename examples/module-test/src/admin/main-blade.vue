<template>
  <div>
    Test blade
    {{ blade.id }}
    <VBtn color="primary" @click="addBlade">add blade</VBtn>
  </div>
</template>

<script setup lang="ts">
import { bladeScopeToken, type IAdminShellBlade } from '@prosto/platform-sdk';
import { inject, shallowReactive } from 'vue';
import { VBtn } from 'vuetify/components';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const scope = inject(bladeScopeToken)!;

const blade = shallowReactive<IAdminShellBlade>(scope.blade);

blade.isLoading = false;

function addBlade() {
  scope.bladeService.showBlade(
    {
      id: `blade.$ddddddv`,
      title: `Blade title $ddddddv`,
      component: {
        template: '<div>dfsdf</div>',
      },
    },
    blade,
  );
}
</script>

<style scoped lang="scss"></style>
