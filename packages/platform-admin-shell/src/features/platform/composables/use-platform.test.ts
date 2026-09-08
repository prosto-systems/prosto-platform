import { type IAdminShellPluginInfo } from '@prosto/platform-sdk/admin';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IPluginLoadResult, PluginLoadFailureCodeType } from '../models';
import { platformApi } from '../api';
import { createPluginLoadResult, loadPlugin } from '../utils';
import { usePlatform } from './use-platform';

vi.mock('../api', () => ({
  platformApi: {
    getManifest: vi.fn(),
  },
}));

vi.mock('../utils', () => {
  return {
    createPluginLoadResult: vi.fn(
      (
        plugin: IAdminShellPluginInfo,
        status: IPluginLoadResult['status'],
        code?: PluginLoadFailureCodeType,
      ): IPluginLoadResult => ({
        moduleId: plugin.moduleId,
        moduleVersion: plugin.moduleVersion,
        status,
        ...(code ? { code } : {}),
      }),
    ),
    loadPlugin: vi.fn(),
  };
});

const plugins: IAdminShellPluginInfo[] = [
  {
    moduleId: 'failing-plugin',
    moduleVersion: '1.0.0',
    runtimeApiVersion: 1,
    entry: { type: 'script', path: '/modules/failing-plugin/entry.js' },
    contentFiles: [
      { type: 'style', path: '/modules/failing-plugin/plugin.css' },
    ],
  },
  {
    moduleId: 'working-plugin',
    moduleVersion: '1.0.0',
    runtimeApiVersion: 1,
    entry: { type: 'script', path: '/modules/working-plugin/entry.js' },
    contentFiles: [
      { type: 'style', path: '/modules/working-plugin/plugin.css' },
    ],
  },
  {
    moduleId: 'invalid-entry-plugin',
    moduleVersion: '1.0.0',
    runtimeApiVersion: 1,
    entry: { type: 'script', path: '/modules/invalid-entry-plugin/entry.js' },
    contentFiles: [],
  },
  {
    moduleId: 'timed-out-plugin',
    moduleVersion: '1.0.0',
    runtimeApiVersion: 1,
    entry: { type: 'script', path: '/modules/timed-out-plugin/entry.js' },
    contentFiles: [],
  },
];

describe('usePlatform plugin loader', () => {
  afterEach((): void => {
    vi.clearAllMocks();
  });

  it('allows a later manifest retry after a failed request', async (): Promise<void> => {
    const recoveredPlugin = {
      moduleId: 'recovered-plugin',
      moduleVersion: '1.0.0',
      runtimeApiVersion: 1 as const,
      entry: {
        type: 'script' as const,
        path: '/modules/recovered-plugin/dist/admin/admin.plugin.js',
      },
      contentFiles: [],
    };

    vi.mocked(platformApi.getManifest)
      .mockRejectedValueOnce(new Error('Manifest temporarily unavailable.'))
      .mockResolvedValueOnce({
        platformName: 'Prosto Platform',
        platformVersion: '1.0.0',
        plugins: [recoveredPlugin],
      });

    const { loadManifest, loadPlugins, manifest } = usePlatform();

    await expect(loadManifest()).resolves.toBeNull();
    expect(manifest.data.value).toBeNull();

    const recoveredManifest = await loadManifest();

    expect(recoveredManifest).toMatchObject({
      plugins: [{ moduleId: 'recovered-plugin' }],
    });
    expect(manifest.data.value?.plugins).toMatchObject([
      { moduleId: 'recovered-plugin' },
    ]);
    expect(platformApi.getManifest).toHaveBeenCalledTimes(2);

    if (!recoveredManifest) {
      throw new Error('Expected the manifest retry to recover.');
    }

    vi.mocked(loadPlugin).mockResolvedValueOnce(
      createPluginLoadResult(recoveredPlugin, 'loaded'),
    );
    await loadPlugins(recoveredManifest.plugins);

    expect(loadPlugin).toHaveBeenCalledWith(recoveredPlugin);
  });

  it('continues in manifest order after individual plugin failures', async (): Promise<void> => {
    const events: string[] = [];

    vi.mocked(loadPlugin).mockImplementation(async (plugin) => {
      events.push(`load:${plugin.moduleId}`);

      switch (plugin.moduleId) {
        case 'failing-plugin':
          return createPluginLoadResult(
            plugin,
            'failed',
            'registration_failed',
          );
        case 'working-plugin':
          return createPluginLoadResult(plugin, 'loaded');
        case 'invalid-entry-plugin':
          return createPluginLoadResult(plugin, 'failed', 'invalid_entry');
        case 'timed-out-plugin':
          return createPluginLoadResult(plugin, 'failed', 'entry_timeout');
        default:
          throw new Error(`Unexpected plugin: ${plugin.moduleId}`);
      }
    });

    const { loadPlugins, pluginLoadResults } = usePlatform();
    const results = await loadPlugins(plugins);

    expect(results).toEqual([
      {
        moduleId: 'failing-plugin',
        moduleVersion: '1.0.0',
        status: 'failed',
        code: 'registration_failed',
      },
      {
        moduleId: 'working-plugin',
        moduleVersion: '1.0.0',
        status: 'loaded',
      },
      {
        moduleId: 'invalid-entry-plugin',
        moduleVersion: '1.0.0',
        status: 'failed',
        code: 'invalid_entry',
      },
      {
        moduleId: 'timed-out-plugin',
        moduleVersion: '1.0.0',
        status: 'failed',
        code: 'entry_timeout',
      },
    ]);
    expect(pluginLoadResults.value).toEqual(results);
    expect(events).toEqual([
      'load:failing-plugin',
      'load:working-plugin',
      'load:invalid-entry-plugin',
      'load:timed-out-plugin',
    ]);
  });
});
