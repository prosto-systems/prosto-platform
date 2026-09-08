import type {
  IAdminShellBlade,
  IAdminShellPlugin,
} from '@prosto/platform-sdk/admin';
import {
  ADMIN_SHELL_RUNTIME_GLOBAL,
  bladeScopeToken,
} from '@prosto/platform-sdk/admin';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { build } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { nextTick } from 'vue';
import { i18n } from '@/app/plugins/i18n';
import { router } from '@/app/router';
import { vuetify } from '@/app/plugins/vuetify';
import { adminShellRuntime } from '@/app/runtime';
import {
  AdminShell,
  createAuthService,
  createBladeService,
  createMainMenuService,
  createWorkspaceService,
  useBladesStore,
  useWorkspacesStore,
} from '@/app/shell';

const moduleTestDirectory = resolve(
  import.meta.dirname,
  '../../../examples/module-test',
);
const previousRuntimeDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  ADMIN_SHELL_RUNTIME_GLOBAL,
);

function pluginCode(result: Awaited<ReturnType<typeof build>>): string {
  const outputs = Array.isArray(result) ? result : [result];
  const chunk = outputs
    .filter(
      (output): output is NonNullable<typeof output> => output !== undefined,
    )
    .flatMap((output) => ('output' in output ? output.output : []))
    .find((output) => output.type === 'chunk' && output.isEntry);

  if (chunk === undefined || chunk.type !== 'chunk') {
    throw new Error('Module test admin build did not produce an entry chunk.');
  }

  return chunk.code;
}

async function importModuleTestPlugin(): Promise<IAdminShellPlugin> {
  const result = await build({
    root: moduleTestDirectory,
    configFile: resolve(moduleTestDirectory, 'vite.config.ts'),
    mode: 'admin',
    logLevel: 'silent',
    build: { write: false },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(pluginCode(result)).toString('base64')}`;

  return (await import(moduleUrl)) as IAdminShellPlugin;
}

afterEach((): void => {
  vi.restoreAllMocks();

  if (previousRuntimeDescriptor === undefined) {
    Reflect.deleteProperty(globalThis, ADMIN_SHELL_RUNTIME_GLOBAL);
    return;
  }

  Object.defineProperty(
    globalThis,
    ADMIN_SHELL_RUNTIME_GLOBAL,
    previousRuntimeDescriptor,
  );
});

describe('module-test admin artifact', () => {
  it('registers and renders a blade with the shell Vue and Vuetify runtime', async (): Promise<void> => {
    const pinia = createPinia();
    const adminShell = new AdminShell(pinia);
    const warnings = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const themeName = vuetify.theme.global.name.value;
    let registeredBlade: IAdminShellBlade | undefined;
    const bladesStore = useBladesStore(pinia);
    vi.spyOn(bladesStore, 'showBlade').mockImplementation(async (blade) => {
      registeredBlade = blade;
    });

    Object.defineProperty(globalThis, ADMIN_SHELL_RUNTIME_GLOBAL, {
      configurable: true,
      value: adminShellRuntime,
    });

    const plugin = await importModuleTestPlugin();

    await adminShell.registerPlugin('module-test', plugin.registerAdminPlugin);

    const workspace = useWorkspacesStore(pinia).workspacesMap.get(
      'workspace.module-test',
    );
    expect(workspace?.onMounted).toBeTypeOf('function');

    const bladeService = createBladeService(pinia);
    workspace?.onMounted?.();

    expect(registeredBlade).toMatchObject({
      id: 'blade.module-test.main',
    });
    if (registeredBlade === undefined) {
      throw new Error('Module test workspace did not register its blade.');
    }

    const wrapper = mount(registeredBlade.component, {
      global: {
        plugins: [pinia, i18n, vuetify, router],
        provide: {
          [bladeScopeToken as symbol]: {
            blade: registeredBlade,
            authService: createAuthService(pinia),
            workspaceService: createWorkspaceService(pinia),
            mainMenuService: createMainMenuService(pinia),
            bladeService,
          },
        },
      },
    });

    expect(adminShell.plugins).toContain('module-test');
    expect(wrapper.text()).toContain('Blade: blade.module-test.main');
    expect(wrapper.text()).toContain('Locale: en');
    expect(wrapper.text()).toContain('Route: /');
    expect(wrapper.text()).toContain('Pinia store: true');
    expect(wrapper.find('button').exists()).toBe(true);
    expect(registeredBlade.isLoading).toBe(false);

    vuetify.theme.change('dark');
    await nextTick();
    expect(wrapper.text()).toContain('Shell theme: dark');
    expect(warnings).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();

    vuetify.theme.change(themeName);
    wrapper.unmount();
  });
});
