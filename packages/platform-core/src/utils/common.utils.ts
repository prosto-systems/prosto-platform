import { AssertionError } from './utils.errors.js';

/**
 * @internal
 * Throws an AssertionError if the condition is falsy.
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

/**
 * @internal
 * Returns the current timestamp as an ISO 8601 string.
 */
export function dateNowIso(): string {
  return new Date().toISOString();
}

/**
 * @stable
 * Redacts known secret patterns from a string message.
 * Covers tokens, passwords, bearer tokens, and authorization headers.
 */
export function redactSecretsInMessage(value: string): string {
  return value
    .replaceAll(/(token|secret|password|apikey|key|auth)=([^\s]+)/gi, '$1=[REDACTED]')
    .replaceAll(/(bearer\s+)([^\s]+)/gi, '$1[REDACTED]')
    .replaceAll(/(authorization:\s*basic\s+)([^\s]+)/gi, '$1[REDACTED]');
}
