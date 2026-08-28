import type { IAdminShellPluginContentFile } from '@prosto/platform-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { injectScript } from './plugins.utils';

describe('injectScript', () => {
  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('loads a plugin script as an ESM module', async (): Promise<void> => {
    const file: IAdminShellPluginContentFile = {
      type: 'script',
      path: '/plugins/module-test/admin.plugin.js',
      hash: 'plugin-hash',
    };
    const appendChild = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node) => node);

    const loading = injectScript(file, 'module-test');
    const script = appendChild.mock.calls[0]?.[0];

    expect(script).toBeInstanceOf(HTMLScriptElement);
    if (!(script instanceof HTMLScriptElement)) {
      throw new Error('Expected the plugin script to be appended.');
    }

    expect(script.type).toBe('module');
    expect(script.async).toBe(false);
    expect(script.getAttribute('src')).toBe(
      '/plugins/module-test/admin.plugin.js?v=plugin-hash',
    );

    script.dispatchEvent(new Event('load'));

    await expect(loading).resolves.toBeUndefined();
  });
});
