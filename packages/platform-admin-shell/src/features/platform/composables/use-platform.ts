import type {
  IAdminShellPluginInfo,
  PlatformHealthType,
  PlatformManifestType,
} from '@prosto/platform-sdk/admin';
import type { ShallowRef } from 'vue';
import type { IPluginLoadResult } from '../models';
import { shallowRef } from 'vue';
import { ApiError } from '@/shared/api';
import { platformApi } from '../api';
import { createPluginLoadResult, loadPlugin } from '../utils';

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

const manifest = createResourceState<PlatformManifestType>();
const isLoadingPlugins = shallowRef(false);
const pluginLoadResults = shallowRef<readonly IPluginLoadResult[]>([]);
let pluginsLoadingPromise: Promise<readonly IPluginLoadResult[]> | null = null;

export function usePlatform() {
  const health = createResourceState<PlatformHealthType>();

  const isRestartingPlatform = shallowRef(false);
  const isUpdatingMaintenance = shallowRef(false);

  function loadPlugins(
    plugins: readonly IAdminShellPluginInfo[],
  ): Promise<readonly IPluginLoadResult[]> {
    if (pluginsLoadingPromise) {
      return pluginsLoadingPromise;
    }

    isLoadingPlugins.value = true;
    pluginLoadResults.value = plugins.map((plugin) =>
      createPluginLoadResult(plugin, 'pending'),
    );

    pluginsLoadingPromise = (async (): Promise<
      readonly IPluginLoadResult[]
    > => {
      const results = plugins.map((plugin) =>
        createPluginLoadResult(plugin, 'pending'),
      );

      for (const [index, plugin] of plugins.entries()) {
        const result = await loadPlugin(plugin);

        results[index] = result;
        pluginLoadResults.value = [...results];
      }

      return results;
    })().finally(() => {
      isLoadingPlugins.value = false;
      pluginsLoadingPromise = null;
    });

    return pluginsLoadingPromise;
  }

  async function loadResource<TValue>(
    resource: IResourceState<TValue>,
    request: () => Promise<TValue>,
  ): Promise<void> {
    resource.isLoading.value = true;
    resource.error.value = null;

    try {
      resource.data.value = await request();
    } catch (error) {
      resource.error.value = toApiError(error);
    } finally {
      resource.isLoading.value = false;
    }
  }

  async function loadManifest(): Promise<PlatformManifestType | null> {
    manifest.isLoading.value = true;
    manifest.error.value = null;

    try {
      manifest.data.value = await platformApi.getManifest();
      return manifest.data.value;
    } catch (error) {
      manifest.data.value = null;
      manifest.error.value = toApiError(error);
      return null;
    } finally {
      manifest.isLoading.value = false;
    }
  }

  function loadHealth(): Promise<void> {
    return loadResource(health, platformApi.getHealth);
  }

  async function restartPlatform(csrfToken: string): Promise<void> {
    isRestartingPlatform.value = true;

    try {
      await platformApi.restartPlatform(csrfToken);
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
      await platformApi.setMaintenance(enabled, csrfToken);
      await loadHealth();
    } finally {
      isUpdatingMaintenance.value = false;
    }
  }

  return {
    manifest,
    health,
    isLoadingPlugins,
    pluginLoadResults,
    isRestartingPlatform,
    isUpdatingMaintenance,
    loadPlugins,
    loadManifest,
    loadHealth,
    restartPlatform,
    setMaintenance,
  };
}
