import type { IAdminShellAuthService } from './admin-shell-auth-service.interface.js';
import type {
  IAdminShellBlade,
  IAdminShellBladeService,
} from './admin-shell-blade-service.interface.js';
import type { IAdminShellWorkspaceService } from './admin-shell-workspace-service.interface.js';
import type { IAdminShellMainMenuService } from './admin-shell-main-menu-service.interface.js';
import type { IAdminShellBladeToolbarService } from './admin-shell-blade-toolbar-service.interface.js';

export interface IAdminShellBladeScope {
  readonly blade: IAdminShellBlade;
  readonly authService: IAdminShellAuthService;
  readonly workspaceService: IAdminShellWorkspaceService;
  readonly mainMenuService: IAdminShellMainMenuService;
  readonly bladeService: IAdminShellBladeService;
  readonly bladeToolbarService: IAdminShellBladeToolbarService;
}
