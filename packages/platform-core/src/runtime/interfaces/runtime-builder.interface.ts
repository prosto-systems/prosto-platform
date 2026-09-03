import type { IPlatformRuntime } from './platform-runtime.interface.js';
import type { IRuntimeBuilderOptions } from './runtime-builder-options.interface.js';

/**
 * @alpha
 * Runtime builder contract.
 */
export interface IRuntimeBuilder {
  /**
   * Creates a configured, non-started runtime.
   *
   * @param options - Runtime composition and deployment configuration inputs.
   */
  build(options: IRuntimeBuilderOptions): IPlatformRuntime;
}
