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
 * Dependency declaration against another module.
 */
export interface IPlatformModuleDependency {
  readonly id: ModuleIdentifierType;
  readonly version: SemverRangeType;
  readonly optional?: boolean;
}

/**
 * @alpha
 * Declares a module version range that cannot coexist with this module.
 */
export interface IPlatformModuleIncompatibility {
  readonly id: ModuleIdentifierType;
  readonly version: SemverRangeType;
}

/**
 * @alpha
 * Canonical SDK manifest contract for executable modules.
 */
export interface IPlatformModuleManifest {
  readonly id: ModuleIdentifierType;
  readonly version: SemverVersionType;
  readonly sdkVersion: SemverRangeType;
  readonly nodeVersion?: SemverRangeType;
  readonly title: string;
  readonly description?: string;
  readonly optional?: boolean;
  readonly iconUrl?: string;
  readonly projectUrl?: string;
  readonly dependencies: readonly IPlatformModuleDependency[];
  readonly incompatibilities?: readonly IPlatformModuleIncompatibility[];
  readonly groups?: readonly string[];
  readonly tags?: readonly string[];
  readonly authors?: readonly string[];
  readonly owners?: readonly string[];
  readonly copyright?: string;
}
