<template>
  <v-app>
    <v-app-bar theme="dark" color="primary" density="comfortable">
      <v-app-bar-title>{{ $t('app.title') }}</v-app-bar-title>

      <v-spacer />

      <div class="d-flex align-center mx-5">
        <v-btn :to="{ name: 'diagnostics' }" density="comfortable" icon>
          <v-badge
            :model-value="!!rejectedCount"
            :content="rejectedCount"
            color="error"
          >
            <v-icon icon="mdi-bug" />
          </v-badge>
        </v-btn>
      </div>
    </v-app-bar>

    <v-main>
      <DegradedModeBanner />

      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { DegradedModeBanner } from '@/widgets/degraded-mode-banner';
import { useDiagnosticsStore } from '@/entities/diagnostics';
import { storeToRefs } from 'pinia';

const diagnosticsStore = useDiagnosticsStore();
const { rejectedCount } = storeToRefs(diagnosticsStore);
</script>
