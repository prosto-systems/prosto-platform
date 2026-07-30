import type {
  IPlatformModuleContext,
  IPlatformModuleManifest,
  PlatformStartupPolicyType,
} from '@prosto/platform-sdk';

/**
 * @alpha
 * Options for creating module contexts.
 */
export interface ICreateModuleContextOptions {
  readonly startupPolicy: PlatformStartupPolicyType;
  readonly sdkVersion: string;
  readonly moduleManifest: IPlatformModuleManifest;
}

/**
 * @alpha
 * Factory for creating module contexts.
 */
export interface IModuleContextFactory {
  create(options: ICreateModuleContextOptions): IPlatformModuleContext;
}
