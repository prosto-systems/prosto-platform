import { id } from '../../manifest.json';
import type { RegisterPluginCallbackType } from '@prosto/platform-sdk';
import MainBlade from './main-blade.vue';

export const registerAdminPlugin: RegisterPluginCallbackType = ({
  workspaceService,
  mainMenuService,
  bladeService,
}) => {
  const PLATFORM_MODULE_ID = id;
  const workspace = `workspace.${PLATFORM_MODULE_ID}`;

  workspaceService.addWorkspace(workspace, {
    url: '/test',
    title: 'Test',
    permission: 'maintenance:manage',
    onMounted() {
      console.log(`Workspace ${PLATFORM_MODULE_ID} mounted`);

      bladeService.showBlade({
        id: `blade.${PLATFORM_MODULE_ID}.main`,
        title: `Blade title ${PLATFORM_MODULE_ID}`,
        isClosingDisabled: true,
        size: 'large',
        component: MainBlade,
      });
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
};
