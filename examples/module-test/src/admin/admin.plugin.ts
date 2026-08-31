import type { IAdminShellPluginContext } from '@prosto/platform-sdk';
import { id } from '../../manifest.json';
import { messages } from './locales';
import MainBlade from './main-blade.vue';

export function registerAdminPlugin({
  translationService,
  workspaceService,
  mainMenuService,
  bladeService,
}: IAdminShellPluginContext) {
  const PLATFORM_MODULE_ID = id;
  const WORKSPACE = `workspace.${PLATFORM_MODULE_ID}`;

  translationService.registerLocaleMessages(messages);

  workspaceService.addWorkspace(WORKSPACE, {
    url: '/test',
    title: 'module_test.main_blade.title',
    permission: 'maintenance:manage',
    onMounted() {
      console.log(`Workspace ${PLATFORM_MODULE_ID} mounted`);

      bladeService.showBlade({
        id: `blade.${PLATFORM_MODULE_ID}.main`,
        title: 'module_test.main_blade.title',
        subtitle: PLATFORM_MODULE_ID,
        isClosingDisabled: true,
        size: 'large',
        component: MainBlade,
      });
    },
    onUnmounted() {
      console.log(`Workspace ${PLATFORM_MODULE_ID} unmounted`);
    },
  });

  workspaceService.addWorkspace(WORKSPACE + '2', {
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
    title: 'module_test.main_blade.title',
    permission: 'maintenance:manage',
    action: async () => {
      await workspaceService.go(WORKSPACE);
    },
  });

  mainMenuService.addMenuItem({
    path: `browse/${PLATFORM_MODULE_ID}2`,
    title: 'Test2',
    permission: 'maintenance:manage',
    action: async () => {
      await workspaceService.go(WORKSPACE + '2');
    },
  });

  console.debug(`Plugin ${PLATFORM_MODULE_ID} registered`);
}
