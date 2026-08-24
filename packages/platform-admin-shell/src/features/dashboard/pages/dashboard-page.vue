<template>
  <v-container class="dashboard" fluid>
    <header class="dashboard-header">
      <div>
        <p class="dashboard-kicker">{{ t('dashboard.operationsConsole') }}</p>

        <h1 class="dashboard-title">
          {{ t('dashboard.greeting', { name: greeting }) }}
        </h1>

        <p class="dashboard-subtitle">
          {{ t('dashboard.subtitle') }}
        </p>
      </div>

      <v-chip
        :color="
          platform.health.data.value?.status === 'healthy'
            ? 'success'
            : 'warning'
        "
        prepend-icon="mdi-pulse"
        variant="tonal"
      >
        {{
          platform.health.data.value
            ? t(`dashboard.statuses.${platform.health.data.value.status}`)
            : t('dashboard.checkingPlatform')
        }}
      </v-chip>
    </header>

    <DashboardKpiCards
      :error="dashboard.summary.error.value !== null"
      :is-loading="dashboard.summary.isLoading.value"
      :summary="dashboard.summary.data.value"
      @retry="dashboard.loadSummary"
    />

    <DashboardOperationsPanel
      class="dashboard-section"
      :can-manage-maintenance="canManageMaintenance"
      :can-restart-platform="canRestartPlatform"
      :is-restarting-platform="platform.isRestartingPlatform.value"
      :is-updating-maintenance="platform.isUpdatingMaintenance.value"
      :summary="dashboard.summary.data.value"
      @restart-platform="handlePlatformRestart"
      @update-maintenance="handleMaintenanceChange"
    />

    <v-row class="dashboard-section" density="comfortable">
      <v-col cols="12" md="5">
        <DashboardHealthPanel
          :error="platform.health.error.value !== null"
          :health="platform.health.data.value"
          :is-loading="platform.health.isLoading.value"
          @retry="platform.loadHealth"
        />
      </v-col>

      <v-col cols="12" md="7">
        <DashboardActivityPanel
          :activity="dashboard.activity.data.value"
          :error="dashboard.activity.error.value !== null"
          :is-loading="dashboard.activity.isLoading.value"
          @retry="dashboard.loadActivity"
        />
      </v-col>
    </v-row>

    <DashboardModulesPanel
      class="dashboard-section"
      :can-restart="canRestartModules"
      :error="dashboard.modules.error.value !== null"
      :is-loading="dashboard.modules.isLoading.value"
      :modules="dashboard.modules.data.value"
      :restarting-module-id="dashboard.restartingModuleId.value"
      @restart="handleModuleRestart"
      @retry="dashboard.loadModules"
    />

    <v-snackbar
      v-model="snackbar.visible"
      color="surface-variant"
      location="bottom right"
      role="status"
      timeout="4000"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  DashboardActivityPanel,
  DashboardHealthPanel,
  DashboardKpiCards,
  DashboardModulesPanel,
  DashboardOperationsPanel,
  useDashboard,
} from '@/features/dashboard';
import { useAuthStore } from '@/features/auth';
import { usePlatform } from '@/features/platform';

const authStore = useAuthStore();
const platform = usePlatform();
const dashboard = useDashboard();
const { t } = useI18n();
const snackbar = shallowRef({ message: '', visible: false });

const canRestartModules = computed(() => authStore.can('modules:restart'));
const canRestartPlatform = computed(() => authStore.can('platform:restart'));
const canManageMaintenance = computed(() =>
  authStore.can('maintenance:manage'),
);
const greeting = computed(
  () => authStore.principal?.displayName ?? t('dashboard.defaultGreetingName'),
);

onMounted(() => loadAll());

function loadAll() {
  platform.loadHealth();
  dashboard.loadSummary();
  dashboard.loadModules();
  dashboard.loadActivity();
}

async function runAction(
  action: () => Promise<void>,
  successMessage: string,
): Promise<void> {
  try {
    await action();
    snackbar.value = { message: successMessage, visible: true };
  } catch {
    snackbar.value = {
      message: t('dashboard.operationFailed'),
      visible: true,
    };
  }
}

async function handleModuleRestart(moduleId: string): Promise<void> {
  await runAction(
    () => dashboard.restartModule(moduleId, getCsrfToken()),
    t('dashboard.moduleRestartQueued'),
  );
}

async function handlePlatformRestart(): Promise<void> {
  await runAction(async () => {
    await platform.restartPlatform(getCsrfToken());
    await dashboard.loadActivity();
  }, t('dashboard.platformRestartQueued'));
}

async function handleMaintenanceChange(enabled: boolean): Promise<void> {
  await runAction(
    async () => {
      await platform.setMaintenance(enabled, getCsrfToken());
      await Promise.all([dashboard.loadSummary(), dashboard.loadActivity()]);
    },
    enabled
      ? t('dashboard.maintenanceEnabled')
      : t('dashboard.maintenanceDisabled'),
  );
}

function getCsrfToken(): string {
  if (!authStore.csrfToken) {
    throw new Error('The current session has no CSRF token.');
  }

  return authStore.csrfToken;
}
</script>

<style scoped>
.dashboard {
  margin: 0 auto;
  max-width: 1440px;
  padding: 24px;
}

.dashboard-header {
  align-items: flex-start;
  display: flex;
  gap: 20px;
  justify-content: space-between;
  margin: 4px 0 28px;
}

.dashboard-kicker,
.dashboard-title,
.dashboard-subtitle {
  margin: 0;
}

.dashboard-kicker {
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.dashboard-title {
  font-size: clamp(1.2rem, 3vw, 1.6rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
  margin-top: 5px;
}

.dashboard-subtitle {
  color: rgba(var(--v-theme-on-surface), 0.64);
  margin-top: 8px;
  max-width: 660px;
}

.dashboard-section {
  margin-top: 16px;
}

@media (max-width: 599px) {
  .dashboard {
    padding: 16px;
  }

  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }
}
</style>
