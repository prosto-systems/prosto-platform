import type { ModuleArtifactSourceDescriptorType } from '@/modularity/index.js';

/**
 * @alpha
 * Options for configuring the runtime builder.
 */
export interface IRuntimeBuilderOptions {
  /**
   * List of modules to load
   */
  readonly modules?: readonly ModuleArtifactSourceDescriptorType[];
  /**
   * Environment name for loading environment-specific config
   * @default process.env.NODE_ENV || 'production'
   */
  readonly environment?: string;
  /**
   * Path to the configuration file directory
   * @default '.'
   */
  readonly configDir?: string;
  /**
   * Command line arguments for config overrides
   * @default process.argv.slice(2)
   */
  readonly commandLineArgs?: string[];
  /**
   * Optional correlation ID for tracing
   */
  readonly correlationId?: string;
}
