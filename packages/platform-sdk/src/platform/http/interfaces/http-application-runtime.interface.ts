/** @alpha Narrow runtime dependency required by an HTTP application host. */
export interface IHttpApplicationRuntime {
  readonly started: boolean;
  readonly degraded: boolean;
  readonly stopped: boolean;
  readonly startedModuleIds: readonly string[];
  start(): Promise<void>;
  stop(): Promise<void>;
}
