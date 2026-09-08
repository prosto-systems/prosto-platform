import { createHash } from 'node:crypto';
import { lstat, readFile, realpath, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import {
  ADMIN_SHELL_RUNTIME_API_VERSION,
  type IAdminShellPluginInfo,
} from '@prosto/platform-sdk/admin';
import type {
  IAdminModuleAssetFile,
  IAdminModuleAssets,
} from './interfaces/index.js';

const STYLE_EXPORT_PREFIX = './admin/styles/';
const SUPPORT_EXPORT_PREFIX = './admin/assets/';
const ADMIN_BUILD_PATH = ['dist', 'admin'];

const CONTENT_TYPES_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** @internal Reads only concrete trusted administration exports from a package. */
export class AdminAssetExportsParser {
  async parse(
    packageRoot: string,
    moduleId: string,
    moduleVersion: string,
  ): Promise<IAdminModuleAssets | undefined> {
    const packageJsonPath = join(packageRoot, 'package.json');
    const packageJson = this._parsePackageJson(
      await readFile(packageJsonPath, 'utf8'),
    );
    const exportsValue = packageJson.exports;

    if (exportsValue === undefined) return undefined;

    if (!this._isRecord(exportsValue)) {
      throw new Error(
        'Package exports must be an object to declare admin assets.',
      );
    }

    const adminExportEntries = Object.entries(exportsValue).filter(
      ([key]) => key === './admin' || key.startsWith('./admin/'),
    );

    if (!adminExportEntries.length) return undefined;

    const adminEntry = exportsValue['./admin'];

    if (typeof adminEntry !== 'string') {
      throw new Error('The ./admin export must target one concrete ESM file.');
    }

    const canonicalPackageRoot = await realpath(packageRoot);
    const canonicalAdminBuildRoot = await realpath(
      join(packageRoot, ...ADMIN_BUILD_PATH),
    );
    const declaredTargets = new Set<string>();
    const assets: IAdminModuleAssetFile[] = [];
    let entryAsset: IAdminModuleAssetFile | undefined;
    const styleAssets: IAdminModuleAssetFile[] = [];

    for (const [exportKey, target] of adminExportEntries.sort(
      ([left], [right]) => left.localeCompare(right),
    )) {
      const assetKind = this._getAssetKind(exportKey, target);
      const asset = await this._readAsset(
        canonicalPackageRoot,
        canonicalAdminBuildRoot,
        moduleId,
        target,
        assetKind,
      );

      if (declaredTargets.has(asset.filePath)) {
        throw new Error(
          'Administration export targets must not be duplicated.',
        );
      }

      declaredTargets.add(asset.filePath);
      assets.push(asset);

      if (exportKey === './admin') {
        entryAsset = asset;
      } else if (assetKind === 'style') {
        styleAssets.push(asset);
      }
    }

    if (!entryAsset) {
      throw new Error(
        'The ./admin export is required for administration assets.',
      );
    }

    const plugin: IAdminShellPluginInfo = Object.freeze({
      moduleId,
      moduleVersion,
      runtimeApiVersion: ADMIN_SHELL_RUNTIME_API_VERSION,
      entry: Object.freeze({
        type: 'script',
        path: entryAsset.pathname,
        hash: entryAsset.version,
      }),
      contentFiles: Object.freeze(
        styleAssets.map((asset) =>
          Object.freeze({
            type: 'style',
            path: asset.pathname,
            hash: asset.version,
          }),
        ),
      ),
    });

    return Object.freeze({ assets: Object.freeze(assets), plugin });
  }

  private _parsePackageJson(value: string): Record<string, unknown> {
    const parsed: unknown = JSON.parse(value);

    if (!this._isRecord(parsed)) {
      throw new Error('Package metadata must be a JSON object.');
    }

    return parsed;
  }

  private _getAssetKind(
    exportKey: string,
    target: unknown,
  ): 'entry' | 'style' | 'support' {
    if (typeof target !== 'string') {
      throw new Error(
        `Administration export ${exportKey} must use a concrete string target.`,
      );
    }

    if (exportKey === './admin') return 'entry';

    if (
      exportKey.startsWith(STYLE_EXPORT_PREFIX) &&
      exportKey.length > STYLE_EXPORT_PREFIX.length
    ) {
      return 'style';
    }

    if (
      exportKey.startsWith(SUPPORT_EXPORT_PREFIX) &&
      exportKey.length > SUPPORT_EXPORT_PREFIX.length
    ) {
      return 'support';
    }

    throw new Error(`Unsupported administration export key: ${exportKey}.`);
  }

  private async _readAsset(
    canonicalPackageRoot: string,
    canonicalAdminBuildRoot: string,
    moduleId: string,
    target: unknown,
    assetKind: 'entry' | 'style' | 'support',
  ): Promise<IAdminModuleAssetFile> {
    if (typeof target !== 'string' || !this._isSafeTarget(target)) {
      throw new Error('Administration asset target is invalid.');
    }

    const extension = this._getExtension(target);

    if (
      (assetKind === 'entry' && extension !== '.js' && extension !== '.mjs') ||
      (assetKind === 'style' && extension !== '.css') ||
      (assetKind === 'support' &&
        (extension === '.css' ||
          (extension !== '.js' &&
            extension !== '.mjs' &&
            !(extension in CONTENT_TYPES_BY_EXTENSION))))
    ) {
      throw new Error(
        'Administration asset has an unsupported file extension.',
      );
    }

    const candidatePath = resolve(canonicalPackageRoot, target);

    if (!this._isPathInside(canonicalPackageRoot, candidatePath)) {
      throw new Error('Administration asset target escapes the package root.');
    }

    await this._rejectSymlinkPath(canonicalPackageRoot, candidatePath);

    const fileStats = await stat(candidatePath);

    if (!fileStats.isFile()) {
      throw new Error('Administration asset target must be a regular file.');
    }

    const canonicalTargetPath = await realpath(candidatePath);

    if (!this._isPathInside(canonicalAdminBuildRoot, canonicalTargetPath)) {
      throw new Error(
        'Administration asset target escapes the admin build directory.',
      );
    }

    const bytes = await readFile(canonicalTargetPath);
    const version = createHash('sha256').update(bytes).digest('hex');
    const targetPath = target.slice(2);

    return Object.freeze({
      contentLength: bytes.byteLength,
      contentType:
        CONTENT_TYPES_BY_EXTENSION[extension] ?? 'application/octet-stream',
      etag: `"${version}"`,
      filePath: canonicalTargetPath,
      pathname: `/modules/${moduleId}/${targetPath}`,
      version,
    });
  }

  private _isSafeTarget(target: string): boolean {
    if (
      !target.startsWith('./') ||
      target.includes('\\') ||
      target.includes('%') ||
      target.includes('*') ||
      target.includes('\0')
    ) {
      return false;
    }

    const segments = target.slice(2).split('/');

    return segments.every(
      (segment) =>
        segment.length > 0 && segment !== '..' && !segment.startsWith('.'),
    );
  }

  private _getExtension(target: string): string {
    const fileName = target.slice(target.lastIndexOf('/') + 1);
    const lastDot = fileName.lastIndexOf('.');

    return lastDot < 1 ? '' : fileName.slice(lastDot).toLowerCase();
  }

  private async _rejectSymlinkPath(
    canonicalPackageRoot: string,
    candidatePath: string,
  ): Promise<void> {
    const relativePath = relative(canonicalPackageRoot, candidatePath);
    let currentPath = canonicalPackageRoot;

    for (const segment of relativePath.split(sep)) {
      currentPath = join(currentPath, segment);

      if ((await lstat(currentPath)).isSymbolicLink()) {
        throw new Error(
          'Administration asset targets must not traverse symlinks.',
        );
      }
    }
  }

  private _isPathInside(parentPath: string, childPath: string): boolean {
    const relativePath = relative(parentPath, childPath);

    return (
      relativePath.length > 0 &&
      !relativePath.startsWith(`..${sep}`) &&
      relativePath !== '..' &&
      !relativePath.includes(`${sep}..${sep}`)
    );
  }

  private _isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
