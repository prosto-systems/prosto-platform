import type { IAdminShellMainMenuItem } from '@prosto/platform-sdk';
import { defineStore } from 'pinia';
import { useAuthStore } from '@/features/auth';

export interface IMainMenuItem extends IAdminShellMainMenuItem {
  readonly isFavorite?: boolean;
}

interface IWorkspaceState {
  items: IAdminShellMainMenuItem[];
  favoritePaths: IAdminShellMainMenuItem['path'][];
}

export const useMainMenuStore = defineStore('main-menu', {
  state: (): IWorkspaceState => ({
    items: [],
    favoritePaths: [],
  }),

  getters: {
    menuItems(state): IMainMenuItem[] {
      const authStore = useAuthStore();
      const result: IMainMenuItem[] = [];

      state.items.forEach((item) => {
        if (item.permission && !authStore.can(item.permission)) return;

        result.push({
          ...item,
          icon: item.icon || 'mdi-cube-outline',
          priority: item.priority ?? Number.MAX_SAFE_INTEGER,
          isFavorite: state.favoritePaths.includes(item.path),
        });
      });

      return result.sort((a, b) => {
        if (a.priority == null || b.priority == null) return -1;
        return a.priority < b.priority ? -1 : a.priority > b.priority ? 1 : 0;
      });
    },

    allPaths(state): IMainMenuItem['path'][] {
      return state.items.map(({ path }) => path);
    },

    favoriteMenuItems(): IMainMenuItem[] {
      return this.menuItems.filter(
        (item) => item.isAlwaysFavorite || item.isFavorite,
      );
    },

    browseMenuItems(): IMainMenuItem[] {
      return this.menuItems.filter((item) => item.path.startsWith('browse/'));
    },

    configurationMenuItems(): IMainMenuItem[] {
      return this.menuItems.filter((item) =>
        item.path.startsWith('configuration/'),
      );
    },

    favoriteStorageKey(): string {
      const authStore = useAuthStore();

      return `favorite-menu-paths_${authStore.principal?.id}`;
    },
  },

  actions: {
    addMenuItem(menuItem: IAdminShellMainMenuItem): void {
      console.debug(
        '[AdminShell::useMainMenuStore.addMenuItem]: Menu item',
        menuItem,
      );

      if (this.allPaths.includes(menuItem.path)) {
        console.error(
          `[AdminShell::useWorkspacesStore.addMenuItem]: Menu item path '${menuItem.path}' already exists.`,
        );

        return;
      }

      this.items.push(menuItem);
    },

    removeMenuItem(pathOrMenuItem: string | IAdminShellMainMenuItem): void {
      console.debug(
        '[AdminShell::useMainMenuStore.removeWorkspace]: pathOrMenuItem',
        pathOrMenuItem,
      );

      const index =
        typeof pathOrMenuItem === 'string'
          ? this.items.findIndex((item) => item.path === pathOrMenuItem)
          : this.items.indexOf(pathOrMenuItem);

      this.items.splice(index, 1);
    },

    async loadFavorites(): Promise<void> {
      // TODO: Load from backend
      this.favoritePaths = JSON.parse(
        localStorage.getItem(this.favoriteStorageKey) || '[]',
      );
    },

    async saveFavorites(): Promise<void> {
      // TODO: Save to backend
      localStorage.setItem(
        this.favoriteStorageKey,
        JSON.stringify(this.favoritePaths),
      );
    },

    async toggleFavorite(path: IAdminShellMainMenuItem['path']) {
      if (this.favoritePaths.includes(path)) {
        const index = this.favoritePaths.indexOf(path);

        this.favoritePaths.splice(index, 1);
      } else {
        this.favoritePaths.push(path);
      }

      await this.saveFavorites();
    },
  },
});
