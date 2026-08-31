import type {
  IAdminShellBlade,
  IAdminShellBladeToolbarItem,
} from '@prosto/platform-sdk';
import { defineStore } from 'pinia';
import { useAuthStore } from '@/features/auth';

interface IWorkspaceState {
  toolbarByBladeId: Map<string, IAdminShellBladeToolbarItem[]>;
}

export const useToolbarsStore = defineStore('toolbars', {
  state: (): IWorkspaceState => ({
    toolbarByBladeId: new Map(),
  }),

  getters: {
    toolbarItems(state) {
      const authStore = useAuthStore();

      return (blade: IAdminShellBlade): IAdminShellBladeToolbarItem[] => {
        const result: IAdminShellBladeToolbarItem[] = [];

        (blade.toolbarCommands ?? [])
          .concat(state.toolbarByBladeId.get(blade.id) ?? [])
          .forEach((toolbarItem) => {
            if (
              toolbarItem.permission &&
              !authStore.can(toolbarItem.permission)
            ) {
              return;
            }

            result.push({
              ...toolbarItem,
              icon: toolbarItem.icon || 'mdi-help-box-outline',
              priority: toolbarItem.priority ?? Number.MAX_SAFE_INTEGER,
              isDisabled:
                typeof toolbarItem.isDisabled === 'function'
                  ? toolbarItem.isDisabled()
                  : (toolbarItem.isDisabled ?? false),
            });
          });

        return result.sort((a, b) => Number(a.priority) - Number(b.priority));
      };
    },
  },

  actions: {
    register(toolbarItem: IAdminShellBladeToolbarItem, bladeId: string): void {
      if (this.toolbarByBladeId.has(bladeId)) {
        this.toolbarByBladeId.set(bladeId, []);
      }

      this.toolbarByBladeId.get(bladeId)?.push(toolbarItem);
    },

    tryRegister(toolbarItem: IAdminShellBladeToolbarItem, bladeId: string) {
      if (
        !this.toolbarByBladeId
          .get(bladeId)
          ?.some((item) => item.name === toolbarItem.name)
      ) {
        this.register(toolbarItem, bladeId);
      }
    },

    override(
      toolbarItem: IAdminShellBladeToolbarItem | IAdminShellBladeToolbarItem[],
      bladeId: string,
    ) {
      const toolbarItems = Array.isArray(toolbarItem)
        ? toolbarItem
        : [toolbarItem];

      toolbarItems.forEach((newToolbarItem) => {
        const overrideIndex = this.toolbarByBladeId
          .get(bladeId)
          ?.findIndex((item) => item.name === newToolbarItem.name);

        if (overrideIndex && overrideIndex >= 0) {
          this.toolbarByBladeId
            .get(bladeId)
            ?.splice(overrideIndex, 1, newToolbarItem);
        }
      });
    },
  },
});
