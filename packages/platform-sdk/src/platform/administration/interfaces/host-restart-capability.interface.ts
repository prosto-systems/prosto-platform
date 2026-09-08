/**
 * @alpha
 * Requests this host process to perform a local graceful shutdown. The
 * implementation must be idempotent; distributed restart coordination belongs
 * to a module-level policy.
 */
export interface IHostRestartCapability {
  requestGracefulShutdown(): Promise<void>;
}
