import type {
  IPersistenceRuntimeAdapter,
  PlatformStartupPolicyType,
} from '@prosto/platform-sdk/platform';

/**
 * @alpha
 * Lifecycle execution context shared across lifecycle stages.
 */
export interface IModuleLifecycleContext {
  readonly startupPolicy: PlatformStartupPolicyType;
  readonly sdkVersion: string;
  readonly persistenceAdapter: IPersistenceRuntimeAdapter;
  readonly persistenceState: 'collecting' | 'ready';
}
