import { ADMIN_SHELL_RUNTIME_GLOBAL } from '@prosto/platform-sdk';
import { describe, expect, it } from 'vitest';
import { adminRuntimeNamespaces } from './admin-runtime-namespaces';
import { adminShellRuntime, installAdminRuntime } from './admin-runtime';
import { vuetifyOptions } from '../plugins/vuetify';

describe('admin runtime', () => {
  it('shares the exact Vue ecosystem namespaces used by the shell', () => {
    expect(adminShellRuntime.vue).toBe(adminRuntimeNamespaces.vue);
    expect(adminShellRuntime.i18n).toBe(adminRuntimeNamespaces.i18n);
    expect(adminShellRuntime.pinia).toBe(adminRuntimeNamespaces.pinia);
    expect(adminShellRuntime.vueRouter).toBe(adminRuntimeNamespaces.vueRouter);
    expect(adminShellRuntime.vuetify.components).toBe(
      vuetifyOptions.components,
    );
    expect(adminShellRuntime.vuetify.directives).toBe(
      vuetifyOptions.directives,
    );
    expect(Object.isFrozen(adminShellRuntime)).toBe(true);
    expect(Object.isFrozen(adminShellRuntime.vuetify)).toBe(true);
  });

  it('installs once and permits reinstalling the same runtime', () => {
    const target = {};

    expect(installAdminRuntime(target)).toBe(adminShellRuntime);
    expect(installAdminRuntime(target)).toBe(adminShellRuntime);
    expect(Reflect.get(target, ADMIN_SHELL_RUNTIME_GLOBAL)).toBe(
      adminShellRuntime,
    );
    expect(
      Object.getOwnPropertyDescriptor(target, ADMIN_SHELL_RUNTIME_GLOBAL),
    ).toMatchObject({
      configurable: false,
      enumerable: false,
      writable: false,
    });
  });

  it('rejects a conflicting global runtime', () => {
    const target = {
      [ADMIN_SHELL_RUNTIME_GLOBAL]: Object.freeze({ apiVersion: 2 }),
    };

    expect(() => installAdminRuntime(target)).toThrow(
      `Cannot install admin runtime: ${ADMIN_SHELL_RUNTIME_GLOBAL} already contains an incompatible value.`,
    );
  });
});
