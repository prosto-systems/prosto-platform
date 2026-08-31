import type { IAdminShellPluginContext } from './admin-shell-plugin-context.interface.js';

/**
 * @alpha
 * Callback invoked when a platform module registers an admin shell plugin.
 */
export type RegisterPluginCallbackType = (
  ctx: IAdminShellPluginContext,
) => void | Promise<void>;

/**
 * @alpha
 * Registers an admin plugin after its ESM entry has been imported and validated.
 */
export interface IAdminShell {
  plugins: readonly string[];

  registerPlugin: (
    platformModuleId: string,
    callback: RegisterPluginCallbackType,
  ) => Promise<this>;
}
