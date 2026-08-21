<template>
  <section aria-labelledby="health-panel-title">
    <v-card class="panel-card" flat>
      <v-card-title class="panel-title-row">
        <span id="health-panel-title">{{ t('dashboard.serviceHealth') }}</span>

        <v-spacer />

        <v-chip
          v-if="health"
          :color="health.status === 'healthy' ? 'success' : 'warning'"
          size="small"
        >
          {{ t(`dashboard.statuses.${health.status}`) }}
        </v-chip>
      </v-card-title>

      <v-skeleton-loader
        v-if="isLoading && !health"
        type="list-item-two-line@2"
      />

      <v-alert
        v-else-if="error"
        class="ma-4"
        density="compact"
        aria-live="assertive"
        type="error"
        variant="tonal"
      >
        {{ t('dashboard.healthUnavailable') }}
        <template #append>
          <v-btn size="small" variant="text" @click="emit('retry')">
            {{ t('errors.retry') }}
          </v-btn>
        </template>
      </v-alert>

      <v-list v-else-if="health" class="health-list" density="compact">
        <v-list-item v-for="service in health.services" :key="service.name">
          <template #prepend>
            <span
              :class="['status-dot', `status-dot--${service.status}`]"
              aria-hidden="true"
            />
          </template>

          <v-list-item-title>{{ service.name }}</v-list-item-title>

          <template #append>
            <span class="status-label">
              {{ t(`dashboard.statuses.${service.status}`) }}
            </span>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </section>
</template>

<script setup lang="ts">
import type { PlatformHealthType } from '../models';
import { useI18n } from 'vue-i18n';

interface IProps {
  readonly error: boolean;
  readonly health: PlatformHealthType | null;
  readonly isLoading: boolean;
}

const emit = defineEmits<{ retry: [] }>();
defineProps<IProps>();

const { t } = useI18n();
</script>

<style scoped>
.panel-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  height: 100%;
}

.panel-title-row {
  display: flex;
  font-size: 1rem;
  font-weight: 600;
  padding: 16px 18px 10px;
}

.health-list {
  padding: 4px 8px 12px;
}

.status-dot {
  background: rgb(var(--v-theme-success));
  border-radius: 50%;
  height: 8px;
  width: 8px;
  margin-right: 4px;
}

.status-dot--degraded,
.status-dot--maintenance {
  background: rgb(var(--v-theme-warning));
}

.status-label {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.78rem;
  text-transform: capitalize;
}
</style>
