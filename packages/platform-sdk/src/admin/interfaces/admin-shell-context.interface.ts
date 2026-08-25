import type { IAdminShellAuthService } from './admin-shell-auth-service.interface.js';
// import type { IAdminShellBladeService } from './admin-shell-blade-service.interface.js';
import type { IAdminShellMainMenuService } from './admin-shell-main-menu-service.interface.js';
import type { IAdminShellWorkspaceService } from './admin-shell-workspace-service.interface.js';

/**
 * @alpha
 * Runtime context passed to an admin shell plugin registration callback.
 */
export interface IAdminShellContext {
  readonly moduleId: string;
  readonly authService: IAdminShellAuthService;
  readonly workspaceService: IAdminShellWorkspaceService;
  readonly mainMenuService: IAdminShellMainMenuService;
  // readonly bladeService: IAdminShellBladeService;
}
