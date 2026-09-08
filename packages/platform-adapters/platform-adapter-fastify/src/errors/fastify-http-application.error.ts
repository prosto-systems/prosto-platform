import type { HttpApplicationStateType } from '@prosto/platform-sdk/platform';

/** @alpha Error codes emitted by the Fastify HTTP application lifecycle. */
export const FASTIFY_HTTP_APPLICATION_ERROR_CODES = [
  'FASTIFY_HTTP_APPLICATION_INVALID_CONFIGURATION',
  'FASTIFY_HTTP_APPLICATION_SERVICE_COMPOSITION_FAILED',
  'FASTIFY_HTTP_APPLICATION_RUNTIME_STARTUP_FAILED',
  'FASTIFY_HTTP_APPLICATION_ROUTE_ACTIVATION_FAILED',
  'FASTIFY_HTTP_APPLICATION_LISTEN_FAILED',
  'FASTIFY_HTTP_APPLICATION_SHUTDOWN_FAILED',
] as const;

/** @alpha Typed code for a Fastify HTTP application lifecycle failure. */
export type FastifyHttpApplicationErrorCodeType =
  (typeof FASTIFY_HTTP_APPLICATION_ERROR_CODES)[number];

/** @alpha Safe lifecycle context included with Fastify HTTP application errors. */
export interface IFastifyHttpApplicationErrorDetails {
  readonly phase:
    | 'configuration'
    | 'service-composition'
    | 'runtime-startup'
    | 'route-activation'
    | 'listen'
    | 'shutdown';
  readonly state?: HttpApplicationStateType;
}

/**
 * @alpha
 * Reports a Fastify HTTP application failure without exposing transport internals.
 */
export class FastifyHttpApplicationError extends Error {
  constructor(
    readonly code: FastifyHttpApplicationErrorCodeType,
    message: string,
    readonly details: IFastifyHttpApplicationErrorDetails,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'FastifyHttpApplicationError';
  }
}
