export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function dateNowIso(): string {
  return new Date().toISOString();
}

export function redactSecretsInMessage(value: string): string {
  return value
    .replaceAll(/(token|secret|password)=([^\s]+)/gi, '$1=[REDACTED]')
    .replaceAll(/(bearer\s+)([^\s]+)/gi, '$1[REDACTED]');
}
