import type {
  IModuleContext,
  IPlatformModuleManifest,
  StartupPolicyType,
} from '@prosto/platform-sdk';

/**
 * @alpha
 * Options for creating module contexts.
 */
export interface ICreateModuleContextOptions {
  readonly startupPolicy: StartupPolicyType;
  readonly sdkVersion: string;
  readonly moduleManifest: IPlatformModuleManifest;
}

/**
 * @alpha
 * Factory for creating module contexts.
 */
export interface IModuleContextFactory {
  create(options: ICreateModuleContextOptions): IModuleContext;
}
