import type { Component } from 'vue';
import type { NavigationFailure } from 'vue-router';
import type { AdminShellPermissionType } from './admin-shell-auth-service.interface.js';

export interface IAdminShellWorkspace {
  url: string;
  title: string;
  component?: Component;
  permission?: AdminShellPermissionType;
  onMounted?: () => void | Promise<void>;
  onUnmounted?: () => void | Promise<void>;
}

export interface IAdminShellWorkspaceService {
  addWorkspace: (
    workspaceName: string,
    workspace: IAdminShellWorkspace,
  ) => void;
  go: (workspaceName: string) => Promise<NavigationFailure | void | undefined>;
}
