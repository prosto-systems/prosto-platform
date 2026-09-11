/** @alpha Error codes emitted by the Fastify HTTP adapter lifecycle. */
export const FASTIFY_HTTP_ADAPTER_ERROR_CODES = [
  'FASTIFY_HTTP_ADAPTER_INVALID_CONFIGURATION',
  'FASTIFY_HTTP_ADAPTER_INITIALIZATION_FAILED',
  'FASTIFY_HTTP_ADAPTER_START_FAILED',
  'FASTIFY_HTTP_ADAPTER_ROUTE_ACTIVATION_FAILED',
  'FASTIFY_HTTP_ADAPTER_LISTEN_FAILED',
  'FASTIFY_HTTP_ADAPTER_SHUTDOWN_FAILED',
] as const;

/** @alpha Typed code for a Fastify HTTP adapter lifecycle failure. */
export type FastifyHttpAdapterErrorCodeType =
  (typeof FASTIFY_HTTP_ADAPTER_ERROR_CODES)[number];

/** @alpha Safe lifecycle context included with Fastify HTTP adapter errors. */
export interface IFastifyHttpAdapterErrorDetails {
  readonly phase:
    | 'configuration'
    | 'initialization'
    | 'start'
    | 'route-activation'
    | 'listen'
    | 'shutdown';
  readonly state?: string;
}

/**
 * @alpha
 * Reports a Fastify HTTP adapter failure without exposing transport internals.
 */
export class FastifyHttpAdapterError extends Error {
  constructor(
    readonly code: FastifyHttpAdapterErrorCodeType,
    message: string,
    readonly details: IFastifyHttpAdapterErrorDetails,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'FastifyHttpAdapterError';
  }
}
