import type { IAdminShellPluginContentFile } from '@prosto/platform-sdk/admin';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadPluginStyle,
  PluginAssetUrlError,
  removePluginStyles,
  resolvePluginAssetUrl,
} from './plugins.utils';

const pluginScript: IAdminShellPluginContentFile = {
  type: 'script',
  path: '/modules/module-test/admin.plugin.js?locale=ru',
  hash: 'plugin-hash',
};

describe('resolvePluginAssetUrl', () => {
  it('preserves existing query parameters and updates the cache key', (): void => {
    const url = resolvePluginAssetUrl(pluginScript);

    expect(url.pathname).toBe('/modules/module-test/admin.plugin.js');
    expect(url.searchParams.get('locale')).toBe('ru');
    expect(url.searchParams.get('v')).toBe('plugin-hash');
  });

  it.each([
    'https://modules.example.test/module.js',
    'data:text/javascript,export{}',
    'javascript:alert(1)',
    'https://user:password@localhost/plugins/module.js',
    '/modules/../outside/module.js',
  ])('rejects a disallowed plugin asset URL: %s', (path): void => {
    expect(() => resolvePluginAssetUrl({ type: 'script', path })).toThrow(
      PluginAssetUrlError,
    );
  });
});

describe('loadPluginStyle', () => {
  afterEach((): void => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.head.replaceChildren();
  });

  it('awaits the stylesheet load event', async (): Promise<void> => {
    const appendChild = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node) => node);
    const loading = loadPluginStyle(
      resolvePluginAssetUrl({
        type: 'style',
        path: '/modules/module-test/module.css',
      }),
      'module-test',
    );
    const link = appendChild.mock.calls[0]?.[0];

    expect(link).toBeInstanceOf(HTMLLinkElement);
    if (!(link instanceof HTMLLinkElement)) {
      throw new Error('Expected the plugin stylesheet to be appended.');
    }

    expect(link.rel).toBe('stylesheet');
    expect(link.dataset.moduleId).toBe('module-test');

    link.dispatchEvent(new Event('load'));

    await expect(loading).resolves.toBe(link);
  });

  it('removes a stylesheet after a loading error', async (): Promise<void> => {
    const appendChild = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node) => node);
    const loading = loadPluginStyle(
      resolvePluginAssetUrl({
        type: 'style',
        path: '/modules/module-test/module.css',
      }),
      'module-test',
    );
    const link = appendChild.mock.calls[0]?.[0];

    expect(link).toBeInstanceOf(HTMLLinkElement);
    if (!(link instanceof HTMLLinkElement)) {
      throw new Error('Expected the plugin stylesheet to be appended.');
    }

    const remove = vi.spyOn(link, 'remove');
    link.dispatchEvent(new Event('error'));

    await expect(loading).rejects.toThrow('stylesheet failed to load');
    expect(remove).toHaveBeenCalledOnce();
  });

  it('removes a stylesheet after a loading timeout', async (): Promise<void> => {
    vi.useFakeTimers();
    const appendChild = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node) => node);
    const loading = loadPluginStyle(
      resolvePluginAssetUrl({
        type: 'style',
        path: '/modules/module-test/module.css',
      }),
      'module-test',
      50,
    );
    const link = appendChild.mock.calls[0]?.[0];

    expect(link).toBeInstanceOf(HTMLLinkElement);
    if (!(link instanceof HTMLLinkElement)) {
      throw new Error('Expected the plugin stylesheet to be appended.');
    }

    const remove = vi.spyOn(link, 'remove');
    const rejection = expect(loading).rejects.toThrow(
      'stylesheet load timed out',
    );
    await vi.advanceTimersByTimeAsync(50);

    await rejection;
    expect(remove).toHaveBeenCalledOnce();
  });
});

describe('removePluginStyles', () => {
  it('removes all loaded styles after a later plugin failure', (): void => {
    const first = document.createElement('link');
    const second = document.createElement('link');
    document.head.append(first, second);

    removePluginStyles([first, second]);

    expect(first.isConnected).toBe(false);
    expect(second.isConnected).toBe(false);
  });
});
