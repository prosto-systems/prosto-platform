/** @alpha Stable public response returned by an HTTP liveness probe. */
export interface IHttpHealthResponse {
  readonly status: 'healthy';
  readonly timestamp: string;
  readonly uptimeSeconds: number;
}

/** @alpha Typed reason returned when an HTTP readiness probe is not ready. */
export type HttpReadinessReasonType =
  'application_not_listening' | 'runtime_not_started' | 'application_stopping';

/** @alpha Stable public response returned by an HTTP readiness probe. */
export interface IHttpReadinessResponse {
  readonly status: 'ready' | 'not-ready';
  readonly ready: boolean;
  readonly degraded: boolean;
  readonly startedModuleIds: readonly string[];
  readonly reasons: readonly HttpReadinessReasonType[];
  readonly timestamp: string;
}
