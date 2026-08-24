import type {
  AdminShellPermissionType,
  IAdminShell,
  IAdminShellAuthorization,
  IAdminShellNavigation,
  RegisterPluginCallbackType,
} from '@prosto/platform-sdk';
import type { App } from 'vue';
import type { Pinia } from 'pinia';
import { useAuthStore } from '@/features/auth';

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
    if (this.#plugins.includes(platformModuleId)) {
      console.error(
        `[AdminShell::AdminShell.registerPlugin]: Plugin '${platformModuleId}' is already registered.`,
      );

      return this;
    }

    this.#plugins.push(platformModuleId);

    const result = callback({
      moduleId: platformModuleId,
      auth: this._createAuthorization(),
      navigation: this._createNavigation(),
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

  private _createNavigation(): IAdminShellNavigation {
    return {
      add: () => {
        console.debug('[AdminShell::Navigation.add]');
      },
    };
  }
}

export function installAdminShell(app: App, pinia: Pinia): IAdminShell {
  const adminShell = new AdminShell(pinia);

  globalThis.__PROSTO_ADMIN_SHELL__ = adminShell;

  return adminShell;
}
