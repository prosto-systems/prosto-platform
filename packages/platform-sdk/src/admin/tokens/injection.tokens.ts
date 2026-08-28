import type { InjectionKey } from 'vue';
import type {
  IAdminShellAuthService,
  IAdminShellBlade,
  IAdminShellBladeService,
  IAdminShellMainMenuService,
  IAdminShellWorkspaceService,
} from '../interfaces/index.js';

export const bladeScopeToken = Symbol.for('blade-scope') as InjectionKey<{
  readonly blade: IAdminShellBlade;
  readonly authService: IAdminShellAuthService;
  readonly workspaceService: IAdminShellWorkspaceService;
  readonly mainMenuService: IAdminShellMainMenuService;
  readonly bladeService: IAdminShellBladeService;
}>;
