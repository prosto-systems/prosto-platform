import type {
  IAdminShellAuthService,
  IAdminShellBladeService,
  IAdminShellMainMenuService,
  IAdminShellWorkspaceService,
} from '@prosto/platform-sdk';
import {
  useBladesStore,
  useMainMenuStore,
  useWorkspacesStore,
} from '@/app/shell';
import { useAuthStore } from '@/features/auth';
import { computed } from 'vue';
import { pinia as Pinia } from '@/app/plugins';

export function createAuthService(pinia = Pinia): IAdminShellAuthService {
  const authStore = useAuthStore(pinia);

  return {
    can: authStore.can,
  };
}

export function createWorkspaceService(
  pinia = Pinia,
): IAdminShellWorkspaceService {
  const workspacesStore = useWorkspacesStore(pinia);

  return {
    addWorkspace: workspacesStore.addWorkspace,
    go: workspacesStore.go,
  };
}

export function createMainMenuService(
  pinia = Pinia,
): IAdminShellMainMenuService {
  const mainMenuStore = useMainMenuStore(pinia);

  return {
    addMenuItem: mainMenuStore.addMenuItem,
    removeMenuItem: mainMenuStore.removeMenuItem,
  };
}

export function createBladeService(pinia = Pinia): IAdminShellBladeService {
  const bladesStore = useBladesStore(pinia);

  return {
    currentBlade: computed(() => bladesStore.currentBlade),
    findBlade: bladesStore.findBlade,
    showBlade: bladesStore.showBlade,
    closeBlade: bladesStore.closeBlade,
  };
}
