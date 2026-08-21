export function getSafeReturnUrl(
  candidate: string | undefined,
  fallback = '/',
): string {
  if (
    candidate === undefined ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\')
  ) {
    return fallback;
  }

  return candidate;
}
