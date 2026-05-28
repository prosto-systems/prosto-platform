import { pathToFileURL } from 'node:url';
import type { IPlatformModule } from '@prosto/platform-sdk';

type UnknownFunctionType = (...args: unknown[]) => unknown;
type UnknownConstructorType = new (...args: unknown[]) => unknown;

/**
 * @alpha
 * ESM module loading with multi-format export resolution.
 */
export class DynamicModuleLoader {
  static async loadModuleEntry(entryPath: string): Promise<IPlatformModule> {
    const nameSpace = await import(pathToFileURL(entryPath).href);

    const defaultResult = this._tryResolveDefaultExport(nameSpace);
    if (defaultResult) return defaultResult;

    const namedResult = this._tryResolveNamedExports(nameSpace);
    if (namedResult) return namedResult;

    throw new Error('No valid IPlatformModule export found');
  }

  private static _tryResolveDefaultExport(
    nameSpace: Record<string, unknown>,
  ): IPlatformModule | null {
    const defaultExport = nameSpace.default;

    if (!defaultExport) return null;

    if (this._isPlatformModule(defaultExport)) return defaultExport;

    if (this._isPlatformModuleClass(defaultExport)) return new defaultExport();

    return null;
  }

  private static _tryResolveNamedExports(
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

  private static _isPlatformModule(obj: unknown): obj is IPlatformModule {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'manifest' in obj &&
      typeof obj.manifest === 'object' &&
      obj.manifest !== null &&
      'id' in obj.manifest &&
      'register' in obj &&
      typeof obj.register === 'function' &&
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
      'register' in proto &&
      typeof proto.register === 'function' &&
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
