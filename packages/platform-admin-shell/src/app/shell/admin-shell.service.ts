import type { Pinia } from 'pinia';
import type {
  IAdminShell,
  IAdminShellAuthService,
  IAdminShellWorkspaceService,
  RegisterPluginCallbackType,
} from '@prosto/platform-sdk';
import { useWorkspacesStore } from '@/app/shell/navigation';
import { useAuthStore } from '@/features/auth';

export class AdminShell implements IAdminShell {
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

    const result = callback({
      moduleId: platformModuleId,
      authService: this._createAuthService(),
      workspaceService: this._createWorkspaceService(),
    });

    void Promise.resolve(result)
      .then(() => this.#plugins.push(platformModuleId))
      .catch(() => undefined);

    return this;
  };

  private _createAuthService(): IAdminShellAuthService {
    const authStore = useAuthStore(this.#pinia);

    return {
      can: authStore.can,
    };
  }

  private _createWorkspaceService(): IAdminShellWorkspaceService {
    const workspacesStore = useWorkspacesStore(this.#pinia);

    return {
      addWorkspace: workspacesStore.addWorkspace,
      go: workspacesStore.go,
    };
  }
}
