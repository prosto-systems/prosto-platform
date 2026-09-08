<template>
  <section aria-labelledby="dashboard-kpis-title">
    <div class="section-heading">
      <p class="eyebrow">{{ t('dashboard.atAGlance') }}</p>
      <h2 id="dashboard-kpis-title" class="section-title">
        {{ t('dashboard.platformSignals') }}
      </h2>
    </div>

    <v-row v-if="isLoading && !summary" density="comfortable">
      <v-col v-for="index in 4" :key="index" cols="6" lg="3">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <v-alert
      v-else-if="error"
      aria-live="assertive"
      type="error"
      variant="tonal"
    >
      {{ t('dashboard.metricsUnavailable') }}
      <template #append>
        <v-btn size="small" variant="text" @click="emit('retry')">
          {{ t('errors.retry') }}
        </v-btn>
      </template>
    </v-alert>

    <v-row v-else-if="summary" density="comfortable">
      <v-col cols="6" lg="3">
        <v-card class="kpi-card" flat>
          <v-card-text>
            <p class="kpi-label">{{ t('dashboard.services') }}</p>
            <p class="kpi-value">
              {{ summary.healthyModules }}/{{ summary.modules }}
            </p>
            <p class="kpi-caption">{{ t('dashboard.modulesHealthy') }}</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" lg="3">
        <v-card class="kpi-card" flat>
          <v-card-text>
            <p class="kpi-label">{{ t('dashboard.sessions') }}</p>
            <p class="kpi-value">{{ summary.activeSessions }}</p>
            <p class="kpi-caption">{{ t('dashboard.activeOperators') }}</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" lg="3">
        <v-card class="kpi-card" flat>
          <v-card-text>
            <p class="kpi-label">{{ t('dashboard.maintenance') }}</p>
            <p class="kpi-value">
              {{
                summary.maintenanceEnabled
                  ? t('dashboard.on')
                  : t('dashboard.off')
              }}
            </p>
            <p class="kpi-caption">{{ t('dashboard.platformMode') }}</p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" lg="3">
        <v-card class="kpi-card" flat>
          <v-card-text>
            <p class="kpi-label">{{ t('dashboard.availability') }}</p>
            <p class="kpi-value">99.98%</p>
            <p class="kpi-caption">{{ t('dashboard.last24Hours') }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </section>
</template>

<script setup lang="ts">
import type { DashboardSummaryType } from '@prosto/platform-sdk/admin';
import { useI18n } from 'vue-i18n';

interface IProps {
  readonly error: boolean;
  readonly isLoading: boolean;
  readonly summary: DashboardSummaryType | null;
}

const emit = defineEmits<{ retry: [] }>();
defineProps<IProps>();

const { t } = useI18n();
</script>

<style scoped>
.section-heading {
  margin: 0 0 12px;
}

.eyebrow {
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  margin: 0 0 2px;
  text-transform: uppercase;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.kpi-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  min-height: 132px;
}

.kpi-label,
.kpi-caption,
.kpi-value {
  margin: 0;
}

.kpi-label {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.kpi-value {
  font-size: 1.65rem;
  font-weight: 700;
  line-height: 1.35;
  margin-top: 8px;
}

.kpi-caption {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.78rem;
}
</style>
