import type {
  IPersistenceDescriptor,
  IPersistenceRuntimeAdapter,
  IPlatformRuntimeVersionContext,
  IServiceRegistry,
  PlatformStartupPolicyType,
} from '@prosto/platform-sdk/platform';

/**
 * @alpha
 * Input parameters for the bootstrap coordinator.
 */
export interface IBootstrapInput {
  readonly policyMode: PlatformStartupPolicyType;
  readonly runtimeVersion: IPlatformRuntimeVersionContext;
  readonly correlationId: string;
  readonly startupStartedAt: string;
  readonly persistenceAdapter: IPersistenceRuntimeAdapter;
  readonly platformPersistenceDescriptor?: IPersistenceDescriptor;
  readonly services: IServiceRegistry;
}
