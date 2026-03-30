/**
 * @stable
 * Regex pattern for module IDs.
 */
export const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]{2,}$/;

/**
 * @stable
 * Regex pattern for capability identifiers.
 */
export const MODULE_CAPABILITY_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;

/**
 * @stable
 * Security classes allowed for modules.
 */
export const MODULE_SECURITY_CLASSES = [
  'trusted',
  'internal',
  'third-party-reviewed',
] as const;

/**
 * @stable
 * Lifecycle criticality levels used by startup policy.
 */
export const MODULE_CRITICALITY_LEVELS = [
  'normal',
  'critical',
] as const;
