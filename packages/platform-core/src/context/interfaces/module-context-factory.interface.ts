import type { IModuleContext, StartupPolicyType } from '@prosto/platform-sdk';

/**
 * @alpha
 * Options for creating module contexts.
 */
export interface ICreateModuleContextOptions {
  readonly moduleId: string;
  readonly startupPolicy: StartupPolicyType;
  readonly sdkVersion: string;
}

/**
 * @alpha
 * Factory for creating module contexts.
 */
export interface IModuleContextFactory {
  create(options: ICreateModuleContextOptions): IModuleContext;
}
