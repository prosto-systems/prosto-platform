/**
 * @alpha
 * Redacts known secret patterns from a string message.
 * Covers tokens, passwords, bearer tokens, and authorization headers.
 */
export function redactSecretsInMessage(value: string): string {
  return value
    .replaceAll(/(token|secret|password|apikey|key|auth)=([^\s]+)/gi, '$1=[REDACTED]')
    .replaceAll(/(bearer\s+)([^\s]+)/gi, '$1[REDACTED]')
    .replaceAll(/(authorization:\s*basic\s+)([^\s]+)/gi, '$1[REDACTED]');
}
