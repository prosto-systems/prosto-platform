import type { IPlatformRuntime } from './platform-runtime.interface.js';
import type { IRuntimeOptions } from './runtime-options.interface.js';

/**
 * @alpha
 * Runtime builder contract.
 */
export interface IRuntimeBuilder {
  build(options: IRuntimeOptions): IPlatformRuntime;
}
