<template>
  <div>Second</div>
</template>

<script setup lang="ts">
import { type IAdminShellBlade, useBladeScope } from '@prosto/platform-sdk';
import { shallowReactive, shallowRef } from 'vue';

interface IEmits {
  close: [];
}

const emit = defineEmits<IEmits>();

const scope = useBladeScope();

const blade = shallowReactive<IAdminShellBlade>(scope.blade);
const flag = shallowRef(true);

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
      blade.size = 'medium';
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
      component: {
        template: '<div>child</div>',
      },
    },
    blade,
  );
}
</script>
