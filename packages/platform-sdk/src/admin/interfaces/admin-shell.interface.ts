import type { IAdminShellContext } from './admin-shell-context.inteface.js';

export type RegisterPluginCallbackType = (
  ctx: IAdminShellContext,
) => void | Promise<void>;

/**
 * @example
 * (function(global) {
 *   const PLATFORM_MODULE_ID = 'test';
 *   const adminShell = global.adminShell;
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
