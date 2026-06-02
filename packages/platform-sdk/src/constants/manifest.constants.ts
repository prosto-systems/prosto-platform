/**
 * @alpha
 * Regex pattern for module IDs.
 */
export const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]{2,}$/;

/**
 * @alpha
 * Regex pattern for capability identifiers.
 */
export const MODULE_CAPABILITY_PATTERN =
  /^[a-z][a-z0-9-]*(?:\.[*a-z][a-z0-9-_]*)*$/;

/**
 * @alpha
 * Security classes allowed for modules.
 */
export const MODULE_SECURITY_CLASSES = [
  'trusted', // Core platform modules, full access
  'internal', // Internal team modules, standard access
  'third-party-reviewed', // External modules, reviewed and approved
] as const;

/**
 * @alpha
 * Lifecycle criticality levels used by startup policy.
 */
export const MODULE_CRITICALITY_LEVELS = ['standard', 'critical'] as const;
