import type {
  ActivityItemType,
  DashboardSummaryType,
  PlatformModuleType,
} from '@prosto/platform-sdk/admin';
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
  const modules = createResourceState<readonly PlatformModuleType[]>();
  const activity = createResourceState<readonly ActivityItemType[]>();

  const restartingModuleId = shallowRef<string>();

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

  function loadModules(): Promise<void> {
    return loadResource(modules, dashboardApi.getModules);
  }

  function loadActivity(): Promise<void> {
    return loadResource(activity, dashboardApi.getActivity);
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

  return {
    summary,
    modules,
    activity,
    restartingModuleId,
    loadSummary,
    loadModules,
    loadActivity,
    restartModule,
  };
}
