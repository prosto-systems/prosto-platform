import type { AdminShellPermissionType } from './admin-shell-auth-service.interface.js';

export interface IAdminShellMainMenuItem {
  readonly title: string;
  readonly icon: string;
  readonly path?: string;
  readonly permission?: AdminShellPermissionType;
  /** @default NaN */
  readonly priority?: number;
  /** @default false */
  readonly isAlwaysOnBar?: boolean;
  readonly action: (event: PointerEvent) => void | Promise<void>;
}

export interface IAdminShellMainMenuService {
  readonly menuItems: readonly IAdminShellMainMenuItem[];
  addMenuItem: (menuItem: IAdminShellMainMenuItem) => void;
  removeMenuItem: (menuItem: IAdminShellMainMenuItem) => void;
}
