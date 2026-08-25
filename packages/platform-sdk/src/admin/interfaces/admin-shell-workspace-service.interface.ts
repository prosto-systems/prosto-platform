import type { Component } from 'vue';
import type { NavigationFailure } from 'vue-router';
import type { AdminShellPermissionType } from './admin-shell-auth-service.interface.js';

export interface IAdminShellWorkspace {
  url: string;
  title: string;
  component?: Component;
  permission?: AdminShellPermissionType;
  onCreate?: () => void | Promise<void>;
  onMount?: () => void | Promise<void>;
  onUnmount?: () => void | Promise<void>;
}

export interface IAdminShellWorkspaceService {
  addWorkspace: (
    workspaceName: string,
    workspace: IAdminShellWorkspace,
  ) => void;
  go: (workspaceName: string) => Promise<NavigationFailure | void | undefined>;
}
