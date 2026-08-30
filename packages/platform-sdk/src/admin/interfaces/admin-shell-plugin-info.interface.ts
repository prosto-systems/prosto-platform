import type { ADMIN_SHELL_RUNTIME_API_VERSION } from '../constants/index.js';

/**
 * @alpha
 * The kind of static asset declared by an admin shell plugin.
 */
export type AdminShellPluginContentFileType = 'style' | 'script';

/**
 * @alpha
 * A static asset required by an admin shell plugin.
 */
export interface IAdminShellPluginContentFile {
  readonly type: AdminShellPluginContentFileType;
  readonly path: string;
  readonly hash?: string;
}

/**
 * @alpha
 * JavaScript ESM entry artifact for an admin shell plugin.
 */
export interface IAdminShellPluginEntry extends IAdminShellPluginContentFile {
  readonly type: 'script';
}

/**
 * @alpha
 * Stylesheet artifact owned by an admin shell plugin.
 */
export interface IAdminShellPluginStyleFile extends IAdminShellPluginContentFile {
  readonly type: 'style';
}

/**
 * @alpha
 * Manifest information used to load an admin shell plugin.
 */
export interface IAdminShellPluginInfo {
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly runtimeApiVersion: typeof ADMIN_SHELL_RUNTIME_API_VERSION;
  readonly entry: IAdminShellPluginEntry;
  readonly contentFiles: readonly IAdminShellPluginStyleFile[];
}
