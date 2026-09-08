import type { IAdminShellPluginInfo } from '@prosto/platform-sdk/admin';

/** @internal Trusted file metadata retained only inside the core runtime. */
export interface IAdminModuleAssetFile {
  readonly contentLength: number;
  readonly contentType: string;
  readonly etag: string;
  readonly filePath: string;
  readonly pathname: string;
  readonly version: string;
}

/** @internal Parsed, validated administration exports for one module package. */
export interface IAdminModuleAssets {
  readonly assets: readonly IAdminModuleAssetFile[];
  readonly plugin: IAdminShellPluginInfo;
}
