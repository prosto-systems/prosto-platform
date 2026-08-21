import type {
  ActivityItemType,
  DashboardSummaryType,
  PlatformHealthType,
  PlatformModuleType,
} from '../models';
import type { ShallowRef } from 'vue';
import { shallowRef } from 'vue';
import { ApiError } from '@/shared/api';
import { dashboardApi } from '../api';

interface IResourceState<TValue> {
  readonly data: ShallowRef<TValue | null>;
  readonly error: ShallowRef<ApiError | null>;
  readonly isLoading: ShallowRef<boolean>;
}

function createResourceState<TValue>(): IResourceState<TValue> {
  return {
    data: shallowRef<TValue | null>(null),
    error: shallowRef<ApiError | null>(null),
    isLoading: shallowRef(false),
  };
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  return new ApiError({ code: 'request_failed', status: 0 });
}

export function useDashboard() {
  const summary = createResourceState<DashboardSummaryType>();
  const health = createResourceState<PlatformHealthType>();
  const modules = createResourceState<readonly PlatformModuleType[]>();
  const activity = createResourceState<readonly ActivityItemType[]>();

  const restartingModuleId = shallowRef<string>();
  const isRestartingPlatform = shallowRef(false);
  const isUpdatingMaintenance = shallowRef(false);

  async function loadResource<TValue>(
    resource: IResourceState<TValue>,
    request: () => Promise<TValue>,
  ): Promise<void> {
    resource.isLoading.value = true;
    resource.error.value = null;

    try {
      resource.data.value = await request();
    } catch (error: unknown) {
      resource.error.value = toApiError(error);
    } finally {
      resource.isLoading.value = false;
    }
  }

  function loadSummary(): Promise<void> {
    return loadResource(summary, dashboardApi.getSummary);
  }

  function loadHealth(): Promise<void> {
    return loadResource(health, dashboardApi.getHealth);
  }

  function loadModules(): Promise<void> {
    return loadResource(modules, dashboardApi.getModules);
  }

  function loadActivity(): Promise<void> {
    return loadResource(activity, dashboardApi.getActivity);
  }

  function loadAll(): void {
    void loadSummary();
    void loadHealth();
    void loadModules();
    void loadActivity();
  }

  async function restartModule(
    moduleId: string,
    csrfToken: string,
  ): Promise<void> {
    restartingModuleId.value = moduleId;

    try {
      await dashboardApi.restartModule(moduleId, csrfToken);
      await Promise.all([loadModules(), loadActivity()]);
    } finally {
      restartingModuleId.value = undefined;
    }
  }

  async function restartPlatform(csrfToken: string): Promise<void> {
    isRestartingPlatform.value = true;

    try {
      await dashboardApi.restartPlatform(csrfToken);
      await loadActivity();
    } finally {
      isRestartingPlatform.value = false;
    }
  }

  async function setMaintenance(
    enabled: boolean,
    csrfToken: string,
  ): Promise<void> {
    isUpdatingMaintenance.value = true;

    try {
      await dashboardApi.setMaintenance(enabled, csrfToken);
      await Promise.all([loadSummary(), loadHealth(), loadActivity()]);
    } finally {
      isUpdatingMaintenance.value = false;
    }
  }

  return {
    summary,
    health,
    modules,
    activity,
    restartingModuleId,
    isRestartingPlatform,
    isUpdatingMaintenance,
    loadSummary,
    loadHealth,
    loadModules,
    loadActivity,
    loadAll,
    restartModule,
    restartPlatform,
    setMaintenance,
  };
}
