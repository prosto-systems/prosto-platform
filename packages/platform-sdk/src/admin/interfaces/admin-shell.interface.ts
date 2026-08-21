import type { IAdminShellContext } from './admin-shell-context.interface.js';

/**
 * @alpha
 * Callback invoked when a platform module registers an admin shell plugin.
 */
export type RegisterPluginCallbackType = (
  ctx: IAdminShellContext,
) => void | Promise<void>;

/**
 * @alpha
 * @example
 * (function(global) {
 *   const PLATFORM_MODULE_ID = 'test';
 *   const adminShell = global.__PROSTO_ADMIN_SHELL__;
 *
 *   if (!adminShell) {
 *     throw new ReferenceError(
 *       `Plugin ${PLATFORM_MODULE_ID}: 'adminShell' is not supported`,
 *     );
 *   }
 *
 *   adminShell.registerPlugin(PLATFORM_MODULE_ID, ({ moduleId }) => {
 *     console.log('moduleId', moduleId);
 *   });
 * })(globalThis);
 */
export interface IAdminShell {
  registerPlugin: (
    platformModuleId: string,
    callback: RegisterPluginCallbackType,
  ) => this;
}
