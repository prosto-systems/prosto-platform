import type {
  IPersistenceProvider,
  IPersistenceDescriptor,
  ServiceRegistryConfiguratorType,
} from '@prosto/platform-sdk/platform';

/**
 * @alpha
 * Options for configuring the runtime builder.
 */
export interface IRuntimeBuilderOptions {
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
   * Optional persistence provider for persisting runtime state
   */
  readonly persistenceProvider?: IPersistenceProvider;

  /**
   * Optional persistence descriptor for persisting runtime state
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
