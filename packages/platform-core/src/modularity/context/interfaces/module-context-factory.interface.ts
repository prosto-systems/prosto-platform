import type {
  IPersistenceRuntimeAdapter,
  IPlatformModuleContext,
  IPlatformModuleManifest,
  PlatformModuleLifecycleStageType,
  PlatformStartupPolicyType,
} from '@prosto/platform-sdk/platform';

/**
 * @alpha
 * Options for creating module contexts.
 */
export interface ICreateModuleContextOptions {
  readonly startupPolicy: PlatformStartupPolicyType;
  readonly sdkVersion: string;
  readonly moduleManifest: IPlatformModuleManifest;
  readonly lifecycleStage: PlatformModuleLifecycleStageType;
  readonly persistenceAdapter: IPersistenceRuntimeAdapter;
  readonly persistenceState: 'collecting' | 'ready';
}

/**
 * @alpha
 * Factory for creating module contexts.
 */
export interface IModuleContextFactory {
  create(options: ICreateModuleContextOptions): IPlatformModuleContext;
}
