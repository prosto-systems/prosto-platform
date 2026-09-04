/**
 * @alpha
 * Observable lifecycle states for an HTTP application.
 */
export const HTTP_APPLICATION_STATES = [
  'created',
  'starting',
  'listening',
  'stopping',
  'stopped',
  'failed',
] as const;

/** @alpha A lifecycle state of an HTTP application. */
export type HttpApplicationStateType = (typeof HTTP_APPLICATION_STATES)[number];
