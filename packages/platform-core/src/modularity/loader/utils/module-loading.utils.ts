import type {
  IPlatformModule,
  IPlatformModuleManifest,
} from '@prosto/platform-sdk';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { readFile, stat } from 'node:fs/promises';

type UnknownFunctionType = (...args: unknown[]) => unknown;
type UnknownConstructorType = new (...args: unknown[]) => unknown;

/**
 * @alpha
 * Checks whether a filesystem entry can be statted.
 *
 * @param filePath - Path to the entry.
 * @returns `true` when the entry exists and is accessible; otherwise `false`.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @alpha
 * Resolves and imports platform package ESM entries and JSON manifests.
 */
export class DynamicModuleLoader {
  /**
   * Resolves a package manifest from `manifest.json` or
   * `dist/manifest.json`, in that order.
   *
   * @param packageDir - Module package root.
   * @returns The first existing manifest path.
   * @throws When neither supported manifest path exists.
   */
  static async resolveManifestPath(packageDir: string): Promise<string> {
    for (const candidate of ['manifest.json', 'dist/manifest.json']) {
      const candidatePath = join(packageDir, candidate);

      if (await fileExists(candidatePath)) {
        return candidatePath;
      }
    }

    throw new Error('Manifest was not found');
  }

  /**
   * Resolves the platform module entry declared by a package.
   *
   * Resolution prefers the `./platform` export, then the root export's import
   * or default condition, `main`, and finally the conventional platform entry
   * paths.
   *
   * @param packageDir - Module package root in the probing directory.
   * @returns The resolved platform entry path.
   * @throws When no supported entry point can be resolved.
   */
  static async resolvePlatformModuleEntryPath(
    packageDir: string,
  ): Promise<string> {
    const pkgPath = join(packageDir, 'package.json');

    if (await fileExists(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

      if (pkg.exports) {
        let entry = pkg.exports['./platform'];

        if (!entry) {
          entry =
            typeof pkg.exports === 'string'
              ? pkg.exports
              : (pkg.exports['.']?.import ?? pkg.exports['.']?.default);
        }

        if (entry) {
          return join(packageDir, entry);
        }
      }

      if (pkg.main) {
        return join(packageDir, pkg.main);
      }
    }

    for (const candidate of [
      'dist/platform/platform.module.js',
      'dist/platform/index.js',
      'dist/index.js',
      'index.js',
    ]) {
      const candidatePath = join(packageDir, candidate);

      if (await fileExists(candidatePath)) {
        return candidatePath;
      }
    }

    throw new Error('No platform module entry point found in package');
  }

  /**
   * Resolves an admin plugin entry declared by a package.
   *
   * Resolution prefers the `./admin` export, then the root export's import or
   * default condition, `main`, and finally conventional admin entry paths.
   *
   * @param packageDir - Module package root.
   * @returns The resolved admin plugin entry path.
   * @throws When no supported entry point can be resolved.
   */
  static async resolveAdminShellPluginEntryPath(
    packageDir: string,
  ): Promise<string> {
    const pkgPath = join(packageDir, 'package.json');

    if (await fileExists(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

      if (pkg.exports) {
        let entry = pkg.exports['./admin'];

        if (!entry) {
          entry =
            typeof pkg.exports === 'string'
              ? pkg.exports
              : (pkg.exports['.']?.import ?? pkg.exports['.']?.default);
        }

        if (entry) {
          return join(packageDir, entry);
        }
      }

      if (pkg.main) {
        return join(packageDir, pkg.main);
      }
    }

    for (const candidate of [
      'dist/admin/admin.module.js',
      'dist/admin/index.js',
    ]) {
      const candidatePath = join(packageDir, candidate);

      if (await fileExists(candidatePath)) {
        return candidatePath;
      }
    }

    throw new Error('No admin shell plugin entry point found in package');
  }

  /**
   * Imports a JSON module manifest and returns its default export.
   *
   * @param manifestPath - Absolute or relative path to `manifest.json`.
   * @returns The structurally recognized module manifest.
   * @throws When the JSON module has no recognizable default manifest export.
   */
  static async loadModuleManifest(
    manifestPath: string,
  ): Promise<IPlatformModuleManifest> {
    const nameSpace = await import(pathToFileURL(manifestPath).href, {
      with: { type: 'json' },
    });

    const defaultResult = this._tryResolveManifestDefaultExport(nameSpace);
    if (defaultResult) return defaultResult;

    throw new Error('No valid IPlatformModuleManifest export found');
  }

  /**
   * Imports and instantiates an executable platform module entry.
   *
   * A default or named export may be an `IPlatformModule` instance or a
   * zero-argument class. Named functions prefixed with `create`, `init`,
   * `factory`, `build`, or `make` are invoked as module factories.
   *
   * @param entryPath - Path to the platform ESM entry.
   * @returns The resolved module instance.
   * @throws When no export resolves to an `IPlatformModule`.
   */
  static async loadModuleEntry(entryPath: string): Promise<IPlatformModule> {
    const nameSpace = await import(pathToFileURL(entryPath).href);

    const defaultResult = this._tryResolveModuleDefaultExport(nameSpace);
    if (defaultResult) return defaultResult;

    const namedResult = this._tryResolveModuleNamedExports(nameSpace);
    if (namedResult) return namedResult;

    throw new Error('No valid IPlatformModule export found');
  }

  private static _tryResolveManifestDefaultExport(
    nameSpace: Record<string, unknown>,
  ): IPlatformModuleManifest | null {
    const defaultExport = nameSpace.default;

    if (!defaultExport) return null;

    if (this._isPlatformModuleManifest(defaultExport)) return defaultExport;

    return null;
  }

  private static _tryResolveModuleDefaultExport(
    nameSpace: Record<string, unknown>,
  ): IPlatformModule | null {
    const defaultExport = nameSpace.default;

    if (!defaultExport) return null;

    if (this._isPlatformModule(defaultExport)) return defaultExport;

    if (this._isPlatformModuleClass(defaultExport)) return new defaultExport();

    return null;
  }

  private static _tryResolveModuleNamedExports(
    nameSpace: Record<string, unknown>,
  ): IPlatformModule | null {
    for (const key of Object.keys(nameSpace)) {
      if (key === 'default') continue;

      const exportValue = nameSpace[key];

      if (this._isPlatformModule(exportValue)) return exportValue;

      if (this._isPlatformModuleClass(exportValue)) return new exportValue();

      if (this._isFactoryFunction(exportValue)) {
        const result = exportValue();

        if (this._isPlatformModule(result)) return result;
      }
    }

    return null;
  }

  private static _isPlatformModuleManifest(
    obj: unknown,
  ): obj is IPlatformModuleManifest {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'sdkVersion' in obj &&
      'dependencies' in obj &&
      Array.isArray(obj.dependencies)
    );
  }

  private static _isPlatformModule(obj: unknown): obj is IPlatformModule {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'init' in obj &&
      typeof obj.init === 'function' &&
      'start' in obj &&
      typeof obj.start === 'function' &&
      'stop' in obj &&
      typeof obj.stop === 'function'
    );
  }

  private static _isPlatformModuleClass(
    fn: unknown,
  ): fn is new () => IPlatformModule {
    if (typeof fn !== 'function') return false;

    const proto = (fn as UnknownConstructorType).prototype;

    if (!proto || typeof proto !== 'object') return false;

    return (
      'init' in proto &&
      typeof proto.init === 'function' &&
      'start' in proto &&
      typeof proto.start === 'function' &&
      'stop' in proto &&
      typeof proto.stop === 'function'
    );
  }

  private static _isFactoryFunction(fn: unknown): fn is UnknownFunctionType {
    if (typeof fn !== 'function') return false;

    const name = (fn as UnknownFunctionType).name || '';

    return /^(create|init|factory|build|make)/i.test(name);
  }
}
