import type { Component, ComputedRef } from 'vue';
import type { IAdminShellBladeToolbarItem } from './admin-shell-blade-toolbar-service.interface.js';

export interface IAdminShellBlade {
  readonly id: string;
  component: Component;
  headIcon?: string;
  title?: string;
  subtitle?: string;
  navigationGroup?: string;
  /** @default true */
  isLoading?: boolean;
  /** @default false */
  isMaximized?: boolean;
  /** @default false */
  isMaximizedDisabled?: boolean;
  /** @default false */
  isClosingDisabled?: boolean;
  /** @default 'base' */
  size?: 'base' | 'medium' | 'large';
  index?: number;
  error?: string;
  errorBody?: string;
  parentBlade?: IAdminShellBlade;
  childrenBlades?: IAdminShellBlade[];
  toolbarCommands?: IAdminShellBladeToolbarItem[];
  refresh?: () => void;
  onClose?: (doCloseBlade: () => void) => void;
}

export interface IAdminShellBladeService {
  currentBlade: ComputedRef<IAdminShellBlade | undefined>;

  findBlade: (
    id: string,
    navigationGroup?: string,
  ) => IAdminShellBlade | undefined;

  showBlade: (
    newBlade: IAdminShellBlade,
    parentBlade?: IAdminShellBlade,
  ) => void;

  closeBlade: (
    blade: IAdminShellBlade,
    callback?: () => void | Promise<void>,
    onBeforeClosing?: () => void | Promise<void>,
  ) => void;
}
