import type { StartupPolicyType } from '@prosto/platform-sdk';

/**
 * @alpha
 * Lifecycle execution context shared across lifecycle stages.
 */
export interface IModuleLifecycleContext {
  readonly startupPolicy: StartupPolicyType;
  readonly sdkVersion: string;
}
