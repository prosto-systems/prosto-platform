import type {
  AdminShellPermissionType,
  IAdminShellAuthorization,
  IAdminShell,
  RegisterPluginCallbackType,
} from '@prosto/platform-sdk';
import type { Pinia } from 'pinia';
import { useAuthStore } from '@/features/auth';
import type { App } from 'vue';

class AdminShell implements IAdminShell {
  readonly #pinia: Pinia;
  readonly #plugins: string[] = [];

  public constructor(pinia: Pinia) {
    this.#pinia = pinia;
  }

  get plugins(): readonly string[] {
    return this.#plugins;
  }

  public readonly registerPlugin = (
    platformModuleId: string,
    callback: RegisterPluginCallbackType,
  ): this => {
    this.#plugins.push(platformModuleId);

    const result = callback({
      moduleId: platformModuleId,
      auth: this._createAuthorization(),
    });

    void Promise.resolve(result); // .catch(() => undefined);

    return this;
  };

  private _createAuthorization(): IAdminShellAuthorization {
    return {
      can: (permission: AdminShellPermissionType): boolean =>
        useAuthStore(this.#pinia).can(permission),
    };
  }
}

export function installAdminShell(app: App, pinia: Pinia): IAdminShell {
  const adminShell = new AdminShell(pinia);

  globalThis.__PROSTO_ADMIN_SHELL__ = adminShell;

  return adminShell;
}
