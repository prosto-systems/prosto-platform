import type { IAdminShellRuntime } from '@prosto/platform-sdk/admin';
import {
  ADMIN_SHELL_RUNTIME_API_VERSION,
  ADMIN_SHELL_RUNTIME_GLOBAL,
} from '@prosto/platform-sdk/admin';
import { adminRuntimeNamespaces } from './admin-runtime-namespaces';

export const adminShellRuntime: IAdminShellRuntime = Object.freeze({
  apiVersion: ADMIN_SHELL_RUNTIME_API_VERSION,
  vueVersion: adminRuntimeNamespaces.vue.version,
  vuetifyVersion: adminRuntimeNamespaces.vuetify.framework.version,
  vue: adminRuntimeNamespaces.vue,
  i18n: adminRuntimeNamespaces.i18n,
  pinia: adminRuntimeNamespaces.pinia,
  vueRouter: adminRuntimeNamespaces.vueRouter,
  vuetify: adminRuntimeNamespaces.vuetify,
});

export function installAdminRuntime(
  target: object = globalThis,
): IAdminShellRuntime {
  const installedRuntime: unknown = Reflect.get(
    target,
    ADMIN_SHELL_RUNTIME_GLOBAL,
  );

  if (installedRuntime === undefined) {
    Object.defineProperty(target, ADMIN_SHELL_RUNTIME_GLOBAL, {
      configurable: false,
      enumerable: false,
      value: adminShellRuntime,
      writable: false,
    });

    return adminShellRuntime;
  }

  if (installedRuntime === adminShellRuntime) {
    return adminShellRuntime;
  }

  throw new Error(
    `Cannot install admin runtime: ${ADMIN_SHELL_RUNTIME_GLOBAL} already contains an incompatible value.`,
  );
}
