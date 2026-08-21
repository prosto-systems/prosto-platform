<template>
  <section
    v-if="canManageMaintenance || canRestartPlatform"
    aria-labelledby="operations-panel-title"
  >
    <v-card class="operations-card" flat>
      <div>
        <p class="eyebrow">{{ t('dashboard.authorizedOperations') }}</p>

        <h2 id="operations-panel-title" class="operations-title">
          {{ t('dashboard.platformControls') }}
        </h2>

        <p class="operations-description">
          {{ t('dashboard.operationsDescription') }}
        </p>
      </div>

      <div class="operation-actions">
        <v-switch
          v-if="canManageMaintenance"
          :disabled="summary === null"
          :loading="isUpdatingMaintenance"
          :model-value="summary?.maintenanceEnabled ?? false"
          color="warning"
          hide-details
          :label="t('dashboard.maintenanceMode')"
          @update:model-value="updateMaintenance"
        />

        <v-btn
          v-if="canRestartPlatform"
          :loading="isRestartingPlatform"
          color="primary"
          prepend-icon="mdi-restart"
          @click="emit('restartPlatform')"
        >
          {{ t('dashboard.restartPlatform') }}
        </v-btn>
      </div>
    </v-card>
  </section>
</template>

<script setup lang="ts">
import type { DashboardSummaryType } from '../models';
import { useI18n } from 'vue-i18n';

interface IProps {
  readonly canManageMaintenance: boolean;
  readonly canRestartPlatform: boolean;
  readonly isRestartingPlatform: boolean;
  readonly isUpdatingMaintenance: boolean;
  readonly summary: DashboardSummaryType | null;
}

const emit = defineEmits<{
  restartPlatform: [];
  updateMaintenance: [enabled: boolean];
}>();
defineProps<IProps>();

const { t } = useI18n();

function updateMaintenance(enabled: boolean | null): void {
  if (enabled !== null) {
    emit('updateMaintenance', enabled);
  }
}
</script>

<style scoped>
.operations-card {
  align-items: center;
  background: rgba(var(--v-theme-primary), 0.08);
  border: 1px solid rgba(var(--v-theme-primary), 0.22);
  display: flex;
  gap: 20px;
  justify-content: space-between;
  padding: 18px;
}

.eyebrow,
.operations-title,
.operations-description {
  margin: 0;
}

.eyebrow {
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.operations-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin-top: 3px;
}

.operations-description {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.8rem;
  margin-top: 4px;
}

.operation-actions {
  align-items: center;
  display: flex;
  gap: 12px;
}

@media (max-width: 599px) {
  .operations-card,
  .operation-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
