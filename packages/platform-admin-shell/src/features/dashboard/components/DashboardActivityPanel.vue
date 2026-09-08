<template>
  <section aria-labelledby="activity-panel-title">
    <v-card class="panel-card" flat>
      <v-card-title id="activity-panel-title" class="panel-title">
        {{ t('dashboard.recentActivity') }}
      </v-card-title>

      <v-skeleton-loader
        v-if="isLoading && !activity"
        type="list-item-two-line@3"
      />

      <v-alert
        v-else-if="error"
        class="ma-4"
        density="compact"
        aria-live="assertive"
        type="error"
        variant="tonal"
      >
        {{ t('dashboard.activityUnavailable') }}
        <template #append>
          <v-btn size="small" variant="text" @click="emit('retry')">
            {{ t('errors.retry') }}
          </v-btn>
        </template>
      </v-alert>

      <v-list v-else-if="activity?.length" class="activity-list" lines="two">
        <v-list-item v-for="item in activity" :key="item.id">
          <template #prepend>
            <v-icon
              :color="item.severity === 'warning' ? 'warning' : 'primary'"
              :icon="
                item.severity === 'warning'
                  ? 'mdi-alert-outline'
                  : 'mdi-check-circle-outline'
              "
            />
          </template>

          <v-list-item-title>{{ item.message }}</v-list-item-title>

          <v-list-item-subtitle>
            {{ formatTimestamp(item.timestamp) }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <v-card-text v-else class="empty-state">
        {{ t('dashboard.noActivity') }}
      </v-card-text>
    </v-card>
  </section>
</template>

<script setup lang="ts">
import type { ActivityItemType } from '@prosto/platform-sdk/admin';
import { useI18n } from 'vue-i18n';

interface IProps {
  readonly activity: readonly ActivityItemType[] | null;
  readonly error: boolean;
  readonly isLoading: boolean;
}

const emit = defineEmits<{ retry: [] }>();
defineProps<IProps>();

const { locale, t } = useI18n();

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(timestamp));
}
</script>

<style scoped>
.panel-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  height: 100%;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  padding: 16px 18px 10px;
}

.activity-list {
  padding: 0 8px 10px;
}

.empty-state {
  color: rgba(var(--v-theme-on-surface), 0.62);
  padding-bottom: 24px;
}
</style>
