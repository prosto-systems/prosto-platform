import type { ADMIN_SHELL_RUNTIME_API_VERSION } from '../constants/index.js';

/**
 * @alpha
 * Read-only Vue ecosystem namespaces shared by the admin shell with trusted plugin artifacts.
 */
export interface IAdminShellRuntime {
  readonly apiVersion: typeof ADMIN_SHELL_RUNTIME_API_VERSION;
  readonly vueVersion: string;
  readonly vuetifyVersion: string;
  readonly vue: Readonly<Record<string, unknown>>;
  readonly vuetify: Readonly<{
    framework: Readonly<Record<string, unknown>>;
    components: Readonly<Record<string, unknown>>;
    directives: Readonly<Record<string, unknown>>;
  }>;
  readonly i18n: Readonly<Record<string, unknown>>;
  readonly pinia: Readonly<Record<string, unknown>>;
  readonly vueRouter: Readonly<Record<string, unknown>>;
}
