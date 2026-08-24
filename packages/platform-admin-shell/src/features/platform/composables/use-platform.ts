import type { PlatformHealthType, PlatformManifestType } from '../models';
import type { ShallowRef } from 'vue';
import { shallowRef } from 'vue';
import { ApiError } from '@/shared/api';
import { platformApi } from '../api';
import type {
  IAdminShellPluginContentFile,
  IAdminShellPluginInfo,
} from '@prosto/platform-sdk';
import {
  collectFilesByType,
  injectScript,
  injectStyle,
} from '@/features/platform';

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

export function usePlatform() {
  const health = createResourceState<PlatformHealthType>();

  const isRestartingPlatform = shallowRef(false);
  const isUpdatingMaintenance = shallowRef(false);
  const isLoadingPlugins = shallowRef(false);

  async function loadPlugins(plugins: IAdminShellPluginInfo[]): Promise<void> {
    isLoadingPlugins.value = true;

    plugins.forEach((plugin) =>
      collectFilesByType(plugin, 'style').forEach((file) =>
        injectStyle(file, plugin.moduleId),
      ),
    );

    /*
     * Inject scripts sequentially. The topological order returned by the server
     * must be preserved so dependent modules find their prerequisites.
     */
    const scripts: {
      moduleId: string;
      file: IAdminShellPluginContentFile;
    }[] = [];

    plugins.forEach((plugin) =>
      collectFilesByType(plugin, 'script').forEach((file) =>
        scripts.push({ file, moduleId: plugin.moduleId }),
      ),
    );

    return scripts
      .reduce(
        (chain, { file, moduleId }) =>
          chain.then(() => injectScript(file, moduleId)),
        Promise.resolve(),
      )
      .then(() => {
        console.debug('Plugins loaded');
      })
      .finally(() => {
        isLoadingPlugins.value = false;
      });
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

  async function loadManifest(csrfToken: string): Promise<void> {
    manifest.isLoading.value = true;
    manifest.error.value = null;

    try {
      manifest.data.value = await platformApi.getManifest(csrfToken);
    } catch (error) {
      manifest.error.value = toApiError(error);
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
    isRestartingPlatform,
    isUpdatingMaintenance,
    loadPlugins,
    loadManifest,
    loadHealth,
    restartPlatform,
    setMaintenance,
  };
}
