export type AdminShellPluginContentFileType = 'style' | 'script';

export interface IAdminShellPluginContentFile {
  type: AdminShellPluginContentFileType;
  path: string;
  hash?: string;
}

export interface IAdminShellPluginInfo {
  moduleId: string;
  moduleVersion: string;
  entry: IAdminShellPluginContentFile;
  contentFiles: IAdminShellPluginContentFile[];
}
