import type { IAdminShellMainMenuItem } from '@prosto/platform-sdk/admin';
import { defineStore } from 'pinia';
import { useAuthStore } from '@/features/auth';

export interface IMainMenuItem extends IAdminShellMainMenuItem {
  readonly isFavorite?: boolean;
}

interface IWorkspaceState {
  menuItemsByPath: Map<
    IAdminShellMainMenuItem['path'],
    IAdminShellMainMenuItem
  >;
  favoritePaths: IAdminShellMainMenuItem['path'][];
}

export const useMainMenuStore = defineStore('main-menu', {
  state: (): IWorkspaceState => ({
    menuItemsByPath: new Map(),
    favoritePaths: [],
  }),

  getters: {
    menuItems(state): IMainMenuItem[] {
      const authStore = useAuthStore();
      const result: IMainMenuItem[] = [];

      [...state.menuItemsByPath.values()].forEach((item) => {
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

      if (this.menuItemsByPath.has(menuItem.path)) {
        console.error(
          `[AdminShell::useWorkspacesStore.addMenuItem]: Menu item path '${menuItem.path}' already exists.`,
        );

        return;
      }

      this.menuItemsByPath.set(menuItem.path, menuItem);
    },

    removeMenuItem(
      pathOrMenuItem: IAdminShellMainMenuItem['path'] | IAdminShellMainMenuItem,
    ): void {
      console.debug(
        '[AdminShell::useMainMenuStore.removeWorkspace]: pathOrMenuItem',
        pathOrMenuItem,
      );

      const path =
        typeof pathOrMenuItem === 'string'
          ? pathOrMenuItem
          : pathOrMenuItem.path;

      this.menuItemsByPath.delete(path);
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
