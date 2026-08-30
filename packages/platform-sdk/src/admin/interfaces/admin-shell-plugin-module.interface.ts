import type { RegisterPluginCallbackType } from './admin-shell.interface.js';

/**
 * @alpha
 * ESM namespace exported by an admin plugin entry artifact.
 */
export interface IAdminShellPlugin {
  readonly registerAdminPlugin: RegisterPluginCallbackType;
}
