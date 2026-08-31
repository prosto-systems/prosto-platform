import type { AdminShellPermissionType } from './admin-shell-auth-service.interface.js';

export interface IAdminShellBladeToolbarItem {
  /**
   * Display name for the command.
   * Use keys for translation "platform.commands.save"
   */
  readonly name: string;
  readonly icon: string;
  /** Tooltip message for the button. */
  readonly title?: string;
  readonly priority?: number;
  readonly permission?: AdminShellPermissionType;
  readonly showSeparator?: boolean;
  readonly action: () => void | Promise<void>;
  readonly isDisabled?: boolean | (() => boolean);
}

export interface IAdminShellBladeToolbarService {
  register: (toolbarItem: IAdminShellBladeToolbarItem, bladeId: string) => void;
  tryRegister: (
    toolbarItem: IAdminShellBladeToolbarItem,
    bladeId: string,
  ) => void;
  override: (
    toolbarItems: IAdminShellBladeToolbarItem | IAdminShellBladeToolbarItem[],
    bladeId: string,
  ) => void;
}
