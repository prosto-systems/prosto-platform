import type { Pinia } from 'pinia';
import type {
  IAdminShell,
  RegisterPluginCallbackType,
} from '@prosto/platform-sdk';
import {
  createAuthService,
  createBladeService,
  createMainMenuService,
  createWorkspaceService,
} from './utils';

export class AdminShell implements IAdminShell {
  readonly #pinia: Pinia;
  readonly #plugins: string[] = [];

  constructor(pinia: Pinia) {
    this.#pinia = pinia;
  }

  get plugins(): readonly string[] {
    return this.#plugins;
  }

  registerPlugin(
    platformModuleId: string,
    callback: RegisterPluginCallbackType,
  ): this {
    if (this.#plugins.includes(platformModuleId)) {
      console.error(
        `[AdminShell::AdminShell.registerPlugin]: Plugin '${platformModuleId}' is already registered.`,
      );

      return this;
    }

    const result = callback({
      moduleId: platformModuleId,
      authService: createAuthService(this.#pinia),
      workspaceService: createWorkspaceService(this.#pinia),
      mainMenuService: createMainMenuService(this.#pinia),
      bladeService: createBladeService(this.#pinia),
    });

    void Promise.resolve(result)
      .then(() => this.#plugins.push(platformModuleId))
      .catch(() => undefined);

    return this;
  }
}
