<template>
  <section aria-labelledby="modules-panel-title">
    <v-card class="panel-card" flat>
      <v-card-title class="panel-title-row">
        <span id="modules-panel-title">
          {{ t('dashboard.runningModules') }}
        </span>

        <v-spacer />

        <v-chip size="small" variant="tonal">
          {{ t('dashboard.online', { count: modules?.length ?? 0 }) }}
        </v-chip>
      </v-card-title>

      <v-skeleton-loader
        v-if="isLoading && !modules"
        type="table-row-divider@3"
      />

      <v-alert
        v-else-if="error"
        class="ma-4"
        density="compact"
        aria-live="assertive"
        type="error"
        variant="tonal"
      >
        {{ t('dashboard.modulesUnavailable') }}
        <template #append>
          <v-btn size="small" variant="text" @click="emit('retry')">
            {{ t('errors.retry') }}
          </v-btn>
        </template>
      </v-alert>

      <template v-else-if="modules?.length">
        <div class="desktop-table">
          <v-table density="compact">
            <thead>
              <tr>
                <th>{{ t('dashboard.module') }}</th>
                <th>{{ t('dashboard.version') }}</th>
                <th>{{ t('dashboard.status') }}</th>
                <th v-if="canRestart" class="text-right">
                  {{ t('dashboard.action') }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="module in modules" :key="module.id">
                <td class="py-1">
                  <span class="module-name">{{ module.name }}</span>
                  <span class="module-id">{{ module.id }}</span>
                </td>

                <td>{{ module.version }}</td>

                <td>
                  <v-chip
                    :color="module.status === 'healthy' ? 'success' : 'warning'"
                    size="x-small"
                  >
                    {{ t(`dashboard.statuses.${module.status}`) }}
                  </v-chip>
                </td>

                <td v-if="canRestart" class="text-right">
                  <v-btn
                    :disabled="restartingModuleId !== undefined"
                    :loading="restartingModuleId === module.id"
                    size="small"
                    variant="text"
                    @click="emit('restart', module.id)"
                  >
                    {{ t('dashboard.restart') }}
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <div class="mobile-cards">
          <v-card
            v-for="module in modules"
            :key="module.id"
            class="module-card"
            flat
          >
            <div>
              <p class="module-name">{{ module.name }}</p>
              <p class="module-id">{{ module.id }} · {{ module.version }}</p>
            </div>

            <div class="module-actions">
              <v-chip
                :color="module.status === 'healthy' ? 'success' : 'warning'"
                size="x-small"
              >
                {{ t(`dashboard.statuses.${module.status}`) }}
              </v-chip>

              <v-btn
                v-if="canRestart"
                :disabled="restartingModuleId !== undefined"
                :loading="restartingModuleId === module.id"
                icon="mdi-restart"
                size="small"
                variant="text"
                :aria-label="
                  t('dashboard.restartModule', { name: module.name })
                "
                @click="emit('restart', module.id)"
              />
            </div>
          </v-card>
        </div>
      </template>

      <v-card-text v-else class="empty-state">
        {{ t('dashboard.noModules') }}
      </v-card-text>
    </v-card>
  </section>
</template>

<script setup lang="ts">
import type { PlatformModuleType } from '../models';
import { useI18n } from 'vue-i18n';

interface IProps {
  readonly canRestart: boolean;
  readonly error: boolean;
  readonly isLoading: boolean;
  readonly modules: readonly PlatformModuleType[] | null;
  readonly restartingModuleId?: string;
}

const emit = defineEmits<{
  restart: [moduleId: string];
  retry: [];
}>();
defineProps<IProps>();

const { t } = useI18n();
</script>

<style scoped>
.panel-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.panel-title-row {
  display: flex;
  font-size: 1rem;
  font-weight: 600;
  padding: 16px 18px 10px;
}

.module-name,
.module-id {
  display: block;
  margin: 0;
}

.module-name {
  font-weight: 500;
}

.module-id {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-family: monospace;
  font-size: 0.72rem;
  margin-top: 2px;
}

.mobile-cards {
  display: none;
  padding: 8px 16px 16px;
}

.module-card {
  align-items: center;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 12px;
}

.module-actions {
  align-items: center;
  display: flex;
  gap: 4px;
}

.empty-state {
  color: rgba(var(--v-theme-on-surface), 0.62);
  padding-bottom: 24px;
}

@media (max-width: 599px) {
  .desktop-table {
    display: none;
  }

  .mobile-cards {
    display: block;
  }
}
</style>
