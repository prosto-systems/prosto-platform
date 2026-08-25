import type { IAdminShellWorkspace } from '@prosto/platform-sdk';
import { defineStore } from 'pinia';
import { type NavigationFailure } from 'vue-router';
import { router } from '@/app/router';
import { WorkspacePage } from '../pages';

interface IWorkspaceState {
  workspacesMap: Map<string, IAdminShellWorkspace>;
}

export const useWorkspacesStore = defineStore('workspaces', {
  state: (): IWorkspaceState => ({
    workspacesMap: new Map(),
  }),

  actions: {
    addWorkspace(workspaceName: string, workspace: IAdminShellWorkspace): void {
      console.debug(
        `[AdminShell::useWorkspacesStore.addWorkspace]: Workspace '${workspaceName}'`,
        workspace,
      );

      if (this.workspacesMap.has(workspaceName)) {
        console.error(
          `[AdminShell::useWorkspacesStore.addWorkspace]: Workspace '${workspaceName}' already exists.`,
        );

        return;
      }

      router.addRoute('Workspace', {
        name: workspaceName,
        path: workspace.url.replace(/^\//, ''),
        component: workspace.component ?? WorkspacePage,
        meta: {
          requiresAuth: true,
          title: workspace.title,
          permission: workspace.permission,
          on: {
            mounted: workspace.onMounted,
            unmounted: workspace.onUnmounted,
          },
        },
      });

      this.workspacesMap.set(workspaceName, workspace);
    },

    removeWorkspace(workspaceName: string): void {
      console.debug(
        `[AdminShell::useWorkspacesStore.removeWorkspace]: Workspace '${workspaceName}'.`,
      );

      router.removeRoute(workspaceName);

      this.workspacesMap.delete(workspaceName);
    },

    async go(
      workspaceName: string,
    ): Promise<NavigationFailure | void | undefined> {
      console.debug(
        `[AdminShell::useWorkspacesStore.go]: Workspace '${workspaceName}'.`,
      );

      return await router.push({ name: workspaceName });
    },
  },
});
