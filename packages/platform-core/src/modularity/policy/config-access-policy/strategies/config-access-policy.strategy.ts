import type { IPlatformConfig } from '@/runtime/index.js';
import type {
  IConfigAccessEvaluationInput,
  IConfigAccessEvaluationResult,
  IConfigAccessPolicy,
  IConfigAccessPolicyStrategy,
} from '../interfaces/index.js';
import {
  type  ModuleCapabilityType,
  resolveNestedValue,
  snakeToCamel,
} from '@prosto/platform-sdk';
import { RuntimeErrorCodes } from '@/common/index.js';

/**
 * @alpha
 * Default implementation of configuration access policy evaluation.
 * Implements deterministic, default-deny access control based on:
 * - capability-to-section mapping
 * - security class allowlists
 * - production strict mode enforcement
 */
export class ConfigAccessPolicyStrategy implements IConfigAccessPolicyStrategy {
  /**
   * Evaluate configuration access for a module.
   * Returns granted/denied status with allowed sections.
   */
  evaluate(
    input: IConfigAccessEvaluationInput,
    policy: IConfigAccessPolicy,
    config: IPlatformConfig,
  ): IConfigAccessEvaluationResult {
    // No config capabilities requested - grant only module-scoped access
    if (!input.configCapabilities.length) {
      return {
        granted: true,
        reason: `Module "${input.moduleId}" has no global config capabilities requested.`,
        allowedSections: [],
      };
    }

    // Check for wildcard patterns (always forbidden)
    const wildcardCapabilities = input.configCapabilities.filter((capability) =>
      capability.includes('*'),
    );

    if (wildcardCapabilities.length) {
      return {
        granted: false,
        denialCode: RuntimeErrorCodes.ConfigWildcardForbidden,
        reason: `Module "${input.moduleId}" requested wildcard config capabilities: ${
          wildcardCapabilities.map((capability) => `"${capability}"`).join(', ')
        }. Wildcards are forbidden.`,
        remediationHint: 'Remove wildcard patterns from capabilities. Use explicit capability identifiers.',
        allowedSections: [],
      };
    }

    // Resolve requested sections from capabilities
    const requestedSections = this._resolveSectionsFromCapabilities(
      input.configCapabilities,
      config,
    );

    // Check if any requested capability is unknown
    const unknownCapabilities = input.configCapabilities.filter(
      (capability) => !requestedSections.has(capability),
    );

    if (unknownCapabilities.length && policy.denyOnUnknownCapability) {
      return {
        granted: false,
        denialCode: RuntimeErrorCodes.ConfigCapabilityInvalid,
        reason: `Module "${input.moduleId}" requested unknown config capabilities: ${
          unknownCapabilities.map((capability) => `"${capability}"`).join(', ')
        }.`,
        remediationHint: 'Ensure all requested capabilities are registered in the runtime policy capability-to-section map.',
        allowedSections: [],
      };
    }

    // Get allowlist for module's security class
    const allowlist =
      policy.sectionAllowlistBySecurityClass[input.securityClass] || [];

    // Filter sections by allowlist
    const allowedSections = [...requestedSections.values()].filter(
      (section) => allowlist.includes(section),
    );

    // Check if all requested sections are allowed
    const deniedSections = [...requestedSections.values()].filter(
      (section) => !allowlist.includes(section),
    );

    if (deniedSections.length) {
      return {
        granted: false,
        denialCode: RuntimeErrorCodes.ConfigSectionNotAllowlisted,
        reason: `Module "${input.moduleId}" with security class "${
          input.securityClass
        }" requested sections not in allowlist: ${
          deniedSections.map((section) => `"${section}"`).join(', ')
        }. Allowed sections for this class: ${
          allowlist.length
            ? allowlist.map((section) => `"${section}"`).join(', ')
            : 'none'
        }.`,
        remediationHint: 'Request a higher security class or remove capabilities that access non-allowlisted sections.',
        allowedSections,
      };
    }

    // Production strict mode check
    if (
      input.isProduction &&
      policy.productionStrictMode &&
      !allowedSections.length &&
      input.configCapabilities.length
    ) {
      return {
        granted: false,
        denialCode: RuntimeErrorCodes.ConfigAccessDenied,
        reason: `Module "${input.moduleId}" requested global config access in production but no sections are allowed. Production strict mode is enabled.`,
        remediationHint: 'Production strict mode blocked access. Review policy configuration or reduce capability requests.',
        allowedSections: [],
      };
    }

    return {
      granted: true,
      reason: `Module "${input.moduleId}" granted access to global sections: ${
        allowedSections.length
          ? allowedSections.map((section) => `"${section}"`).join(', ')
          : 'none'
      }.`,
      allowedSections,
    };
  }

  /**
   * Resolve requested sections from capability declarations.
   * Returns a map of capability -> section for tracking.
   */
  private _resolveSectionsFromCapabilities(
    configCapabilities: readonly ModuleCapabilityType[],
    config: IPlatformConfig,
  ): Map<string, string> {
    const result = new Map<ModuleCapabilityType, string>();

    for (const capability of configCapabilities) {
      const section = capability.replace(/^config\.read\./, '');

      if (resolveNestedValue(config, section) !== undefined) {
        result.set(capability, section);
      } else {
        const sectionInCamelCase = snakeToCamel(section);

        if (resolveNestedValue(config, sectionInCamelCase) !== undefined) {
          result.set(capability, sectionInCamelCase);
        }
      }
    }

    return result;
  }
}
