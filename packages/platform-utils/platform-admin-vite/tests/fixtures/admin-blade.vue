<template>
  <VBtn v-ripple>{{ label }}</VBtn>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from 'vuetify';
import { Ripple } from 'vuetify/directives';

const theme = useTheme();
const label = computed(() =>
  theme.global.current.value.dark ? 'Dark' : 'Light',
);

void Ripple;
</script>
