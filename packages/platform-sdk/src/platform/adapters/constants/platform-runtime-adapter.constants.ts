/** @alpha Supported required runtime-adapter roles. */
export const PLATFORM_RUNTIME_ADAPTER_ROLES = [
  'admin',
  'persistence',
  'http',
] as const;

/** @alpha Fixed component identity for the platform administration adapter. */
export const PLATFORM_ADMIN_COMPONENT_ID = 'platform-admin' as const;
