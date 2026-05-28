import type {
  MODULE_CRITICALITY_LEVELS,
  MODULE_SECURITY_CLASSES,
} from '../constants/index.js';

/**
 * @alpha
 * Canonical module identity token.
 */
export type ModuleIdentifierType = string;

/**
 * @alpha
 * Semantic version string.
 */
export type SemverVersionType = string;

/**
 * @alpha
 * Semantic version range expression.
 */
export type SemverRangeType = string;

/**
 * @alpha
 * Security class taxonomy for module governance.
 * - 'trusted' – Core platform modules, full access
 * - 'internal' – Internal team modules, standard access
 * - 'third-party-reviewed' – External modules, reviewed and approved
 */
export type ModuleSecurityClassType = (typeof MODULE_SECURITY_CLASSES)[number];

/**
 * @alpha
 * Module startup criticality marker.
 */
export type ModuleCriticalityType = (typeof MODULE_CRITICALITY_LEVELS)[number];

/**
 * @alpha
 * Namespaced capability string declared by a module.
 */
export type ModuleCapabilityType = string;
