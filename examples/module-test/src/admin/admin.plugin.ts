import { id } from '../../manifest.json';

(function (global) {
  const PLATFORM_MODULE_ID = id;
  const adminShell = global.__PROSTO_ADMIN_SHELL__;

  if (!adminShell) {
    throw new ReferenceError(
      `Plugin ${PLATFORM_MODULE_ID}: '__POSTO_ADMIN_SHELL__' is not supported`,
    );
  }

  adminShell.registerPlugin(PLATFORM_MODULE_ID, ({ workspaceService }) => {
    console.log(`Plugin ${PLATFORM_MODULE_ID} registered`);

    workspaceService.addWorkspace(`workspace.${PLATFORM_MODULE_ID}`, {
      url: '/test',
      title: 'Test',
      onCreate() {
        console.log(`Workspace ${PLATFORM_MODULE_ID} created`);
      },
      onMount() {
        console.log(`Workspace ${PLATFORM_MODULE_ID} mounted`);
      },
      onUnmount() {
        console.log(`Workspace ${PLATFORM_MODULE_ID} unmounted`);
      },
    });
  });
})(globalThis);
