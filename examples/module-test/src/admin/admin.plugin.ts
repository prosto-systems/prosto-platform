import { id } from '../../manifest.json';

(function (global) {
  const PLATFORM_MODULE_ID = id;
  const adminShell = global.__PROSTO_ADMIN_SHELL__;

  if (!adminShell) {
    throw new ReferenceError(
      `Plugin ${PLATFORM_MODULE_ID}: '__POSTO_ADMIN_SHELL__' is not supported`,
    );
  }

  adminShell.registerPlugin(
    PLATFORM_MODULE_ID,
    ({ workspaceService, mainMenuService }) => {
      const workspace = `workspace.${PLATFORM_MODULE_ID}`;

      workspaceService.addWorkspace(workspace, {
        url: '/test',
        title: 'Test',
        permission: 'maintenance:manage',
        onMounted() {
          console.log(`Workspace ${PLATFORM_MODULE_ID} mounted`);
        },
        onUnmounted() {
          console.log(`Workspace ${PLATFORM_MODULE_ID} unmounted`);
        },
      });

      workspaceService.addWorkspace(workspace + '2', {
        url: '/test2',
        title: 'Test',
        permission: 'maintenance:manage',
        onMounted() {
          console.log(`Workspace ${PLATFORM_MODULE_ID}2 mounted`);
        },
        onUnmounted() {
          console.log(`Workspace ${PLATFORM_MODULE_ID}2 unmounted`);
        },
      });

      mainMenuService.addMenuItem({
        path: `browse/${PLATFORM_MODULE_ID}`,
        title: 'Test',
        permission: 'maintenance:manage',
        action: async () => {
          await workspaceService.go(workspace);
        },
      });

      mainMenuService.addMenuItem({
        path: `browse/${PLATFORM_MODULE_ID}2`,
        title: 'Test2',
        permission: 'maintenance:manage',
        action: async () => {
          await workspaceService.go(workspace + '2');
        },
      });

      console.debug(`Plugin ${PLATFORM_MODULE_ID} registered`);
    },
  );
})(globalThis);
