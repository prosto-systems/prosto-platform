import {
  ADMIN_SHELL_GLOBAL,
  ADMIN_SHELL_RUNTIME_GLOBAL,
  type IAdminShell,
  type IAdminShellPluginInfo,
} from '@prosto/platform-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  importPluginEntry,
  loadPluginStyle,
  PluginImportTimeoutError,
} from '../utils';
import { usePlatform } from './use-platform';

vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils')>();

  return {
    ...actual,
    importPluginEntry: vi.fn(),
    loadPluginStyle: vi.fn(),
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
    Reflect.deleteProperty(globalThis, ADMIN_SHELL_RUNTIME_GLOBAL);
    Reflect.deleteProperty(globalThis, ADMIN_SHELL_GLOBAL);
    vi.clearAllMocks();
  });

  it('continues in manifest order after registration, namespace, and import failures', async (): Promise<void> => {
    const events: string[] = [];

    globalThis[ADMIN_SHELL_RUNTIME_GLOBAL] = { apiVersion: 1 } as never;
    globalThis[ADMIN_SHELL_GLOBAL] = {
      plugins: [],
      registerPlugin: async (moduleId, callback) => {
        events.push(`register:${moduleId}`);
        await callback({} as never);
        return globalThis[ADMIN_SHELL_GLOBAL];
      },
    } satisfies IAdminShell;

    vi.mocked(loadPluginStyle).mockImplementation(async (_url, moduleId) => {
      events.push(`style:${moduleId}`);
      return document.createElement('link');
    });
    vi.mocked(importPluginEntry).mockImplementation(async (url) => {
      const moduleId = url.pathname.split('/')[2];

      events.push(`import:${moduleId}`);

      if (moduleId === 'invalid-entry-plugin') {
        return {};
      }

      if (moduleId === 'timed-out-plugin') {
        throw new PluginImportTimeoutError();
      }

      return {
        registerAdminPlugin: async () => {
          if (moduleId === 'failing-plugin') {
            throw new Error('Registration failed.');
          }
        },
      };
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
      'style:failing-plugin',
      'import:failing-plugin',
      'register:failing-plugin',
      'style:working-plugin',
      'import:working-plugin',
      'register:working-plugin',
      'import:invalid-entry-plugin',
      'import:timed-out-plugin',
    ]);
  });
});
