import type {
  IAdminShell,
  IAdminShellPlugin,
  IAdminShellRuntime,
} from '@/index.js';
import {
  ADMIN_SHELL_RUNTIME_API_VERSION,
  adminShellPluginInfoSchema,
  adminShellPluginInfosSchema,
  isAdminShellPluginModule,
} from '@/index.js';
import { describe, expect, expectTypeOf, it } from 'vitest';

const validPlugin = {
  moduleId: 'module-test',
  moduleVersion: '1.0.0',
  runtimeApiVersion: ADMIN_SHELL_RUNTIME_API_VERSION,
  entry: {
    type: 'script',
    path: '/plugins/module-test/admin.plugin.js',
  },
  contentFiles: [
    {
      type: 'style',
      path: '/plugins/module-test/admin.plugin.css',
    },
  ],
};

describe('admin shell runtime contracts', () => {
  it('accepts a v1 plugin manifest', () => {
    expect(adminShellPluginInfoSchema.safeParse(validPlugin).success).toBe(
      true,
    );
  });

  it.each([
    [
      'a non-script entry',
      { ...validPlugin, entry: { ...validPlugin.entry, type: 'style' } },
    ],
    [
      'a script content file',
      {
        ...validPlugin,
        contentFiles: [
          { type: 'script', path: '/plugins/module-test/extra.js' },
        ],
      },
    ],
    ['an invalid module ID', { ...validPlugin, moduleId: 'Module_Test' }],
    ['an empty version', { ...validPlugin, moduleVersion: '' }],
    [
      'an empty entry path',
      { ...validPlugin, entry: { ...validPlugin.entry, path: '' } },
    ],
    [
      'an empty asset hash',
      { ...validPlugin, entry: { ...validPlugin.entry, hash: '' } },
    ],
    [
      'an invalid runtime ABI value',
      { ...validPlugin, runtimeApiVersion: '1' },
    ],
    [
      'a duplicate asset declaration',
      {
        ...validPlugin,
        contentFiles: [
          ...validPlugin.contentFiles,
          { ...validPlugin.contentFiles[0] },
        ],
      },
    ],
    ['an undeclared field', { ...validPlugin, unexpected: true }],
  ])('rejects %s', (_scenario, plugin) => {
    expect(adminShellPluginInfoSchema.safeParse(plugin).success).toBe(false);
  });

  it('rejects duplicate module IDs', () => {
    expect(
      adminShellPluginInfosSchema.safeParse([validPlugin, validPlugin]).success,
    ).toBe(false);
  });

  it('accepts only the named registration export from an ESM namespace', () => {
    const validModule = {
      registerAdminPlugin: (): void => undefined,
    };

    expect(isAdminShellPluginModule(validModule)).toBe(true);
    expect(isAdminShellPluginModule({})).toBe(false);
    expect(isAdminShellPluginModule({ registerAdminPlugin: true })).toBe(false);
    expect(
      isAdminShellPluginModule({
        registerAdminPlugin: (): void => undefined,
        extra: true,
      }),
    ).toBe(false);
  });

  it('exposes literal ABI and awaitable registration contracts', () => {
    expectTypeOf<IAdminShellRuntime['apiVersion']>().toEqualTypeOf<1>();
    expectTypeOf<IAdminShell['registerPlugin']>().returns.toEqualTypeOf<
      Promise<IAdminShell>
    >();
    expectTypeOf<IAdminShellPlugin['registerAdminPlugin']>().toBeFunction();
  });
});
