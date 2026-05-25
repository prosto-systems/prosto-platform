import type { IPlatformRuntimeVersionContext } from '@prosto/platform-sdk';

/**
 * @alpha
 * Configuration options for creating a platform runtime instance.
 */
export interface IRuntimeOptions {
  /**
   * Runtime version context
   */
  readonly runtimeVersion?: IPlatformRuntimeVersionContext;
  /**
   * Optional correlation ID for tracing
   */
  readonly correlationId?: string;
  /**
   * Optional callback to execute when the runtime is stopping
   */
  readonly onStopped?: () => void | Promise<void>;
}
