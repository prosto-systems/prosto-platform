import type { AdminShellPermissionType } from './admin-shell-auth-service.interface.js';

export interface IAdminShellMainMenuItem {
  readonly path: `browse/${string}` | `configuration/${string}`;
  readonly title: string;
  readonly icon?: string;
  readonly permission?: AdminShellPermissionType;
  /** @default NaN */
  readonly priority?: number;
  /** @default false */
  readonly isAlwaysFavorite?: boolean;
  readonly action: (event: Event) => void | Promise<void>;
}

export interface IAdminShellMainMenuService {
  readonly menuItems: readonly IAdminShellMainMenuItem[];
  addMenuItem: (menuItem: IAdminShellMainMenuItem) => void;
  removeMenuItem:
    ((menuItem: IAdminShellMainMenuItem) => void) | ((path: string) => void);
}
