import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import type {
  IAdminAssetCatalog,
  IAdminAssetReader,
  IAdminAssetReadResult,
  IAdminAssetRequest,
} from '@prosto/platform-sdk/platform';
import type { IAdminModuleAssetFile } from './interfaces/index.js';

class AdminAssetReader implements IAdminAssetReader {
  private _opened = false;

  constructor(private readonly _asset: IAdminModuleAssetFile) {}

  async open(): Promise<IAdminAssetReadResult> {
    if (this._opened) {
      throw new Error('Administration asset streams may only be opened once.');
    }

    this._opened = true;

    return {
      metadata: {
        contentLength: this._asset.contentLength,
        contentType: this._asset.contentType,
        etag: this._asset.etag,
      },
      stream: Readable.toWeb(
        createReadStream(this._asset.filePath),
      ) as ReadableStream<Uint8Array>,
    };
  }
}

/** @internal Exact asset lookup backed by validated probing artifacts. */
export class AdminAssetCatalog implements IAdminAssetCatalog {
  private _assetsByPath = new Map<string, IAdminModuleAssetFile>();

  replace(assets: readonly IAdminModuleAssetFile[]): void {
    this._assetsByPath = new Map(
      assets.map((asset) => [asset.pathname, asset]),
    );
  }

  resolveAsset(request: IAdminAssetRequest): IAdminAssetReader | undefined {
    if (!this._isNormalizedPathname(request.pathname)) return undefined;

    const asset = this._assetsByPath.get(request.pathname);

    if (!asset || asset.version !== request.version) return undefined;

    return new AdminAssetReader(asset);
  }

  private _isNormalizedPathname(pathname: string): boolean {
    return (
      pathname.startsWith('/modules/') &&
      !pathname.includes('\\') &&
      !pathname.includes('%') &&
      !pathname
        .split('/')
        .some((segment) => segment === '.' || segment === '..')
    );
  }
}
