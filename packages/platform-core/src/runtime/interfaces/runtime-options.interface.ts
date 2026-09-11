import type {
  IPersistenceDescriptor,
  IPlatformRuntimeVersionContext,
} from '@prosto/platform-sdk/platform';
import type { IRequiredRuntimeAdapters } from './runtime-builder-options.interface.js';

/**
 * @alpha
 * Configuration options for creating a platform runtime instance.
 */
export interface IRuntimeOptions {
  /** Required directly composed runtime adapters. */
  readonly adapters: IRequiredRuntimeAdapters;
  /**
   * Runtime version context
   */
  readonly runtimeVersion?: IPlatformRuntimeVersionContext;

  /**
   * Optional correlation ID for tracing
   */
  readonly correlationId?: string;

  /**
   * Optional platform persistence descriptor
   */
  readonly platformPersistenceDescriptor?: IPersistenceDescriptor;

  /**
   * Optional callback to execute when the runtime is stopping
   */
  readonly onStopped?: () => void | Promise<void>;
}
