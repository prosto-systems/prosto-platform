import type {
  IPlatformModuleContext,
  IPlatformModuleLogger,
  IPlatformModuleManifest,
} from '@prosto/platform-sdk';
import type { IModuleLifecycleContextFactory } from '@/interfaces/index.js';

class MockLogger implements IPlatformModuleLogger {
  debug(_: string, __?: Readonly<Record<string, unknown>>): void {
    /* empty */
  }
  info(_: string, __?: Readonly<Record<string, unknown>>): void {
    /* empty */
  }
  warn(_: string, __?: Readonly<Record<string, unknown>>): void {
    /* empty */
  }
  error(_: string, __?: Readonly<Record<string, unknown>>): void {
    /* empty */
  }
}

/**
 * @alpha
 * Default lifecycle context factory for contract execution.
 */
export class DefaultModuleLifecycleContextFactory implements IModuleLifecycleContextFactory {
  create(moduleManifest: IPlatformModuleManifest): IPlatformModuleContext {
    return {
      environment: 'test',
      config: {},
      moduleId: moduleManifest.id,
      startupPolicy: 'best-effort',
      sdkVersion: moduleManifest.sdkVersion,
      logger: new MockLogger(),
      getConfigValue: <T>(key: string): Readonly<T> => {
        if (key === 'contract.testing.enabled') {
          return true as T;
        }

        return undefined as T;
      },
    };
  }
}
