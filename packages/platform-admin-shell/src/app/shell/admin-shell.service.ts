import type { Pinia } from 'pinia';
import type {
  IAdminShell,
  IAdminShellTranslationService,
  RegisterPluginCallbackType,
} from '@prosto/platform-sdk';
import { registerLocaleMessages } from '@/app/plugins';
import {
  createAuthService,
  createBladeService,
  createBladeToolbarService,
  createMainMenuService,
  createWorkspaceService,
} from './utils';

/**
 * Signals an attempt to register a plugin that is already registered or loading.
 */
export class AdminPluginAlreadyRegisteredError extends Error {
  constructor(platformModuleId: string) {
    super(`Admin plugin already registered: '${platformModuleId}'.`);
    this.name = 'AdminPluginAlreadyRegisteredError';
  }
}

export class AdminShell implements IAdminShell {
  readonly #pinia: Pinia;
  readonly #plugins = new Set<string>();

  constructor(pinia: Pinia) {
    this.#pinia = pinia;
  }

  get plugins(): readonly string[] {
    return [...this.#plugins.values()];
  }

  async registerPlugin(
    platformModuleId: string,
    callback: RegisterPluginCallbackType,
  ): Promise<this> {
    if (this.#plugins.has(platformModuleId)) {
      throw new AdminPluginAlreadyRegisteredError(platformModuleId);
    }

    this.#plugins.add(platformModuleId);

    try {
      await callback({
        moduleId: platformModuleId,
        translationService: this._createTranslationService(),
        authService: createAuthService(this.#pinia),
        workspaceService: createWorkspaceService(this.#pinia),
        mainMenuService: createMainMenuService(this.#pinia),
        bladeService: createBladeService(this.#pinia),
        bladeToolbarService: createBladeToolbarService(this.#pinia),
      });
    } catch {
      this.#plugins.delete(platformModuleId);
    }

    return this;
  }

  private _createTranslationService(): IAdminShellTranslationService {
    return {
      registerLocaleMessages: registerLocaleMessages,
    };
  }
}
