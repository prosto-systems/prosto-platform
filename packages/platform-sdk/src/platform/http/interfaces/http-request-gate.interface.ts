import type { HttpMethodType } from '../constants/index.js';

/** @alpha Input evaluated by a host-wide HTTP request gate. */
export interface IHttpRequestGateInput {
  /** Adapter-validated request method. */
  readonly method: HttpMethodType;
  /** Absolute, normalized request pathname without query or fragment. */
  readonly pathname: string;
  /** Effective client address after trusted-proxy processing, if available. */
  readonly remoteAddress: string | undefined;
}

/** @alpha Stable HTTP statuses emitted by request gates. */
export type HttpRequestGateStatusType = 403 | 429 | 503;

/** @alpha Request-gate result allowing the adapter to continue handling. */
export interface IHttpRequestGateAllow {
  readonly allowed: true;
}

/** @alpha Sanitized request-gate result that denies handler execution. */
export interface IHttpRequestGateDeny {
  readonly allowed: false;
  /** Stable machine-readable reason, safe for an HTTP response. */
  readonly code: string;
  /** Stable denial status, safe for an HTTP response. */
  readonly status: HttpRequestGateStatusType;
}

/** @alpha Decision emitted by an asynchronous HTTP request gate. */
export type HttpRequestGateDecisionType =
  IHttpRequestGateAllow | IHttpRequestGateDeny;

/**
 * @alpha
 * Performs policy checks before a handler consumes a request body. Gate
 * implementations must return only sanitized denial information.
 */
export interface IHttpRequestGate {
  evaluate(input: IHttpRequestGateInput): Promise<HttpRequestGateDecisionType>;
}
