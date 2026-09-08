import type { IAdminShellBlade } from '@prosto/platform-sdk/admin';
import { defineStore } from 'pinia';
import { markRaw } from 'vue';
import { sleep } from '@/shared/utils';
import { router } from '@/app/router';

interface IWorkspaceState {
  currentBlade?: IAdminShellBlade;
  bladesByWorkspace: Map<string | symbol, IAdminShellBlade[]>;
}

export const useBladesStore = defineStore('blades', {
  state: (): IWorkspaceState => ({
    currentBlade: undefined,
    bladesByWorkspace: new Map(),
  }),

  getters: {
    workspaceBlades(state) {
      return (workspaceName?: string | symbol): IAdminShellBlade[] => {
        const workspace = workspaceName || router.currentRoute.value.name;

        if (!workspace) return [];

        return state.bladesByWorkspace.get(workspace) ?? [];
      };
    },
  },

  actions: {
    async resetWorkspaceBlades(workspaceName?: string | symbol) {
      const workspace = workspaceName || router.currentRoute.value.name;

      if (!workspace) {
        throw new Error('Workspace name is missing');
      }

      this.bladesByWorkspace.set(workspace, []);
      this.currentBlade = undefined;
    },

    findBlade(
      id: string,
      navigationGroup?: string,
    ): IAdminShellBlade | undefined {
      return this.workspaceBlades().find(
        (blade) =>
          blade.id === id &&
          (!navigationGroup || blade.navigationGroup === navigationGroup),
      );
    },

    async closeBlade(
      blade: IAdminShellBlade,
      callback?: () => void,
      onBeforeClosing?: (doCloseBladeFinal: () => void) => void,
    ): Promise<void> {
      blade = this.findBlade(blade.id, blade.navigationGroup) || blade;

      this.closeChildrenBlades(blade, () => {
        const doCloseBladeFinal = () => {
          const route = router.currentRoute.value;

          if (!route?.name) {
            throw new Error('Workspace name is missing');
          }

          const index = this.workspaceBlades().findIndex(
            (item) => item.id === blade.id,
          );

          if (index >= 0) {
            this.bladesByWorkspace.get(route.name)?.splice(index, 1);

            console.debug(
              `[AdminShell::useBladesStore.closeBlade]: Blade ID '${blade.id}'`,
            );
          }

          if (blade.parentBlade) {
            const childIndex = blade.parentBlade.childrenBlades?.findIndex(
              (item) => item.id === blade.id,
            );

            if (childIndex !== undefined && childIndex >= 0) {
              blade.parentBlade.childrenBlades?.splice(childIndex, 1);
            }

            this.currentBlade = blade.parentBlade;
          }

          callback?.();
        };

        const doCloseBlade = function () {
          if (onBeforeClosing) {
            onBeforeClosing(doCloseBladeFinal);
          } else {
            doCloseBladeFinal();
          }
        };

        if (blade.onClose) {
          blade.onClose(doCloseBlade);
        } else {
          doCloseBlade();
        }
      });
    },

    closeChildrenBlades(blade: IAdminShellBlade, callback?: () => void): void {
      if (blade.childrenBlades?.length) {
        blade.childrenBlades.forEach((childBlade) =>
          this.closeBlade(childBlade, () => {
            if (!blade.childrenBlades?.length) {
              callback?.();
            }
          }),
        );
      } else {
        callback?.();
      }
    },

    async showBlade(
      newBlade: IAdminShellBlade,
      parentBlade?: IAdminShellBlade,
    ): Promise<void> {
      newBlade.childrenBlades = [];
      newBlade.toolbarCommands ??= [];
      newBlade.isLoading ??= true;
      newBlade.title ??= parentBlade?.title;
      newBlade.headIcon ??= parentBlade?.headIcon || 'mdi-cube-outline';
      newBlade.navigationGroup ??= parentBlade?.navigationGroup;
      newBlade.component = markRaw(newBlade.component);

      await sleep(0); // fix for finding the blade

      const existingBlade = this.findBlade(
        newBlade.id,
        newBlade.navigationGroup,
      );

      if (existingBlade) {
        parentBlade = existingBlade.parentBlade;
        newBlade.index = existingBlade.index;
      } else if (newBlade.index == null) {
        newBlade.index = this.workspaceBlades().length;
      }

      newBlade.parentBlade = parentBlade;

      const showNewBlade = (): void => {
        const route = router.currentRoute.value;

        if (!route?.name) {
          throw new Error('Workspace name is missing');
        }

        if (parentBlade) {
          newBlade.index =
            this.workspaceBlades().findIndex(
              (item) => item.id === parentBlade.id,
            ) + 1;
          parentBlade.childrenBlades ??= [];
          parentBlade.childrenBlades.push(newBlade);
        }

        if (!this.bladesByWorkspace.get(route.name)) {
          this.bladesByWorkspace.set(route.name, []);
        }

        this.bladesByWorkspace
          .get(route.name)
          ?.splice(
            Math.min(
              newBlade.index ?? Number.MAX_SAFE_INTEGER,
              this.workspaceBlades().length,
            ),
            0,
            newBlade,
          );

        this.currentBlade = newBlade;

        console.debug(
          '[AdminShell::useBladesStore.showBlade]: Blade',
          newBlade,
          'Parent Blade',
          parentBlade,
        );
      };

      if (parentBlade?.childrenBlades?.length) {
        this.closeChildrenBlades(parentBlade, showNewBlade);
      } else if (existingBlade) {
        await this.closeBlade(existingBlade, showNewBlade);
      } else {
        setTimeout(() => showNewBlade());
      }
    },
  },
});
