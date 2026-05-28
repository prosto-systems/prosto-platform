import type { ModuleSecurityClassType } from '@prosto/platform-sdk';

/**
 * @alpha
 * Configuration access policy definition.
 * Defines rules for module access to configuration sections.
 */
export interface IConfigAccessPolicy {
  /**
   * Allowlist of global sections per security class.
   * Even if a capability maps to a section, access is denied if the section
   * is not in the allowlist for the module's security class.
   */
  readonly sectionAllowlistBySecurityClass: Record<
    ModuleSecurityClassType,
    readonly string[]
  >;

  /**
   * Whether to enforce strict mode in production.
   * When true, policy violations block module startup in production.
   */
  readonly productionStrictMode: boolean;

  /**
   * Whether to deny access when capability is unknown.
   * Should always be true for security.
   */
  readonly denyOnUnknownCapability: boolean;
}
