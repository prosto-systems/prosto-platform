<template>
  <v-container class="fill-height d-flex align-center" max-width="640">
    <v-card class="pa-6" elevation="2" width="100%">
      <h1 class="text-h4 mt-0 mb-2">{{ t('errors.forbiddenTitle') }}</h1>

      <p class="text-body-1 text-medium-emphasis mb-6">
        {{ t('errors.forbiddenDescription') }}
      </p>

      <v-btn color="primary" to="/">{{ t('errors.returnToDashboard') }}</v-btn>
    </v-card>
  </v-container>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
