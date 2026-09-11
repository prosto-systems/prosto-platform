import type {
  IPersistenceDescriptor,
  IPlatformAdminAdapter,
  IPersistenceRuntimeAdapter,
  IHttpRuntimeAdapter,
  ServiceRegistryConfiguratorType,
} from '@prosto/platform-sdk/platform';

/** @alpha Required directly composed runtime adapters. */
export interface IRequiredRuntimeAdapters {
  readonly admin: IPlatformAdminAdapter;
  readonly persistence: IPersistenceRuntimeAdapter;
  readonly http: IHttpRuntimeAdapter;
}

/**
 * @alpha
 * Options for configuring the runtime builder.
 */
export interface IRuntimeBuilderOptions {
  /** Required administration, persistence, and HTTP adapters. */
  readonly adapters: IRequiredRuntimeAdapters;
  /**
   * Environment name for loading environment-specific config
   * @default process.env.NODE_ENV || 'production'
   */
  readonly environment?: string;

  /**
   * Optional deployment configuration directory. When omitted, the builder
   * loads package defaults but does not read configuration from the current
   * working directory.
   */
  readonly configDir?: string;

  /**
   * Command line arguments for config overrides
   * @default process.argv.slice(2)
   */
  readonly commandLineArgs?: string[];

  /**
   * Optional platform persistence descriptor for persisting runtime state.
   */
  readonly platformPersistenceDescriptor?: IPersistenceDescriptor;

  /**
   * Optional correlation ID for tracing
   */
  readonly correlationId?: string;

  /**
   * Optional synchronous application-host service composition callback.
   *
   * The callback runs after core creates its service registry and before module
   * contexts are constructed. Asynchronous registration is not supported.
   */
  readonly configureServices?: ServiceRegistryConfiguratorType;
}
