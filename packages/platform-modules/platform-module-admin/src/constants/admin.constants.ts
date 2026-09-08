/** @internal Fixed primary key for the singleton administration state record. */
export const ADMIN_STATE_ID = 'platform-admin-state';

/** @internal Paths that remain available while shared maintenance is enabled. */
export const MAINTENANCE_EXEMPT_PATH_PREFIXES = [
  '/api/admin',
  '/modules',
  '/health',
  '/ready',
] as const;
