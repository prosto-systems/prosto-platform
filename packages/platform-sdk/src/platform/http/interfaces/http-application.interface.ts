import type { HttpApplicationStateType } from '../constants/index.js';

/**
 * @alpha
 * Observable single-use HTTP application lifecycle.
 *
 * Start and stop are idempotent and safe to call concurrently.
 */
export interface IHttpApplication {
  readonly state: HttpApplicationStateType;
  readonly url: URL | undefined;
  start(): Promise<void>;
  stop(): Promise<void>;
}
