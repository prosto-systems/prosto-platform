import type {
  MODULE_CRITICALITY_LEVELS,
  MODULE_SECURITY_CLASSES,
} from '../constants/index.js';

/**
 * @stable
 * Canonical module identity token.
 */
export type ModuleIdentifierType = string;

/**
 * @stable
 * Semantic version string.
 */
export type SemverVersionType = string;

/**
 * @stable
 * Semantic version range expression.
 */
export type SemverRangeType = string;

/**
 * @stable
 * Security class taxonomy for module governance.
 */
export type ModuleSecurityClassType = (typeof MODULE_SECURITY_CLASSES)[number];

/**
 * @stable
 * Module startup criticality marker.
 */
export type ModuleCriticalityType = (typeof MODULE_CRITICALITY_LEVELS)[number];

/**
 * @stable
 * Namespaced capability string declared by a module.
 */
export type ModuleCapabilityType = string;
