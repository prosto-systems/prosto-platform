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
  type: AdminShellPluginContentFileType;
  path: string;
  hash?: string;
}

/**
 * @alpha
 * Manifest information used to load an admin shell plugin.
 */
export interface IAdminShellPluginInfo {
  moduleId: string;
  moduleVersion: string;
  entry: IAdminShellPluginContentFile;
  contentFiles: IAdminShellPluginContentFile[];
}
