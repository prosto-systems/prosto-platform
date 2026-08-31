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
    name: 'shell.commands.back',
    title: 'Tooltip',
    icon: 'mdi-arrow-left',
    showSeparator: true,
    action: () => {
      emit('close');
    },
  },
  {
    name: 'shell.commands.refresh',
    title: 'Tooltip',
    icon: 'mdi-refresh',
    action: () => {
      flag.value = !flag.value;
    },
  },
  {
    name: 'shell.commands.add',
    title: 'Tooltip',
    icon: 'mdi-plus',
    action: () => addBlade(),
  },
  {
    name: 'shell.commands.remove',
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
