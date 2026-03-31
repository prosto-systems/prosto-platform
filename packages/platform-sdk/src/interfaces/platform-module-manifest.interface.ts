import type {
  ModuleCapabilityType,
  ModuleCriticalityType,
  ModuleIdentifierType,
  ModuleSecurityClassType,
  SemverRangeType,
  SemverVersionType,
} from '../types/index.js';

/**
 * @stable
 * Basic identity metadata for a module artifact.
 */
export interface IModuleIdentity {
  readonly id: ModuleIdentifierType;
  readonly version: SemverVersionType;
}

/**
 * @stable
 * Compatibility metadata used by runtime admission checks.
 */
export interface IModuleCompatibility {
  readonly sdkVersion: SemverRangeType;
  readonly nodeVersion?: SemverRangeType;
}

/**
 * @stable
 * Dependency declaration against another module.
 */
export interface IModuleDependency {
  readonly id: ModuleIdentifierType;
  readonly version: SemverRangeType;
  readonly optional?: boolean;
}

/**
 * @stable
 * Canonical SDK manifest contract for executable modules.
 */
export interface IPlatformModuleManifest extends IModuleIdentity, IModuleCompatibility {
  readonly criticality: ModuleCriticalityType;
  readonly securityClass: ModuleSecurityClassType;
  readonly capabilities: readonly ModuleCapabilityType[];
  readonly dependencies: readonly IModuleDependency[];
  readonly checksum?: string;
  readonly signature?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}
