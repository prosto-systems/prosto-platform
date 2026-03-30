import type { IPlatformModuleManifest } from '../interfaces/index.js';
import {
  CompatibilityValidationError,
  type ICompatibilityValidationIssue,
} from '../errors/index.js';
import { isSemverSatisfied, isSemverVersion } from '../utils/index.js';

/**
 * @stable
 * Runtime version context used for manifest compatibility checks.
 */
export interface IPlatformRuntimeVersionContext {
  readonly sdkVersion: string;
  readonly nodeVersion?: string;
}

/**
 * @stable
 * Successful compatibility validation result.
 */
export interface ICompatibilityValidationSuccess {
  readonly compatible: true;
  readonly issues: readonly [];
}

/**
 * @stable
 * Failed compatibility validation result.
 */
export interface ICompatibilityValidationFailure {
  readonly compatible: false;
  readonly issues: readonly ICompatibilityValidationIssue[];
}

/**
 * @stable
 * Compatibility validation result union.
 */
export type CompatibilityValidationResultType =
  | ICompatibilityValidationSuccess
  | ICompatibilityValidationFailure;

function validateRuntimeVersion(
  field: 'sdkVersion' | 'nodeVersion',
  version?: string,
): ICompatibilityValidationIssue[] {
  if (version === undefined) {
    return [];
  }

  if (isSemverVersion(version)) {
    return [];
  }

  return [
    {
      field,
      code: 'RUNTIME_VERSION_INVALID',
      message: `Runtime ${field} must be a valid semver version.`,
      expectedRange: 'valid semver version',
      actualVersion: version,
    },
  ];
}

/**
 * @stable
 * Validates runtime compatibility between manifest ranges and concrete versions.
 */
export function validateManifestCompatibility(
  manifest: IPlatformModuleManifest,
  runtime: IPlatformRuntimeVersionContext,
): CompatibilityValidationResultType {
  const issues: ICompatibilityValidationIssue[] = [];

  issues.push(...validateRuntimeVersion('sdkVersion', runtime.sdkVersion));
  issues.push(...validateRuntimeVersion('nodeVersion', runtime.nodeVersion));

  /*
  if (
    !issues.length &&
    !isSemverSatisfied(runtime.platformVersion, manifest.platformVersion)
  ) {
    issues.push({
      field: 'platformVersion',
      code: 'VERSION_RANGE_MISMATCH',
      message: 'Runtime platformVersion is outside the manifest platformVersion range.',
      expectedRange: manifest.platformVersion,
      actualVersion: runtime.platformVersion,
    });
  }
  */

  if (
    !issues.length &&
    !isSemverSatisfied(runtime.sdkVersion, manifest.sdkVersion)
  ) {
    issues.push({
      field: 'sdkVersion',
      code: 'VERSION_RANGE_MISMATCH',
      message: 'Runtime sdkVersion is outside the manifest sdkVersion range.',
      expectedRange: manifest.sdkVersion,
      actualVersion: runtime.sdkVersion,
    });
  }

  if (!issues.length && manifest.nodeVersion) {
    if (!runtime.nodeVersion) {
      issues.push({
        field: 'nodeVersion',
        code: 'RUNTIME_VERSION_MISSING',
        message: 'Manifest requires nodeVersion but runtime context did not provide it.',
        expectedRange: manifest.nodeVersion,
      });
    } else if (!isSemverSatisfied(runtime.nodeVersion, manifest.nodeVersion)) {
      issues.push({
        field: 'nodeVersion',
        code: 'VERSION_RANGE_MISMATCH',
        message: 'Runtime nodeVersion is outside the manifest nodeVersion range.',
        expectedRange: manifest.nodeVersion,
        actualVersion: runtime.nodeVersion,
      });
    }
  }

  if (issues.length) {
    return { compatible: false, issues };
  }

  return { compatible: true, issues: [] };
}

/**
 * @stable
 * Asserts manifest compatibility and throws on mismatch.
 */
export function assertManifestCompatibility(
  manifest: IPlatformModuleManifest,
  runtime: IPlatformRuntimeVersionContext,
): void {
  const result = validateManifestCompatibility(manifest, runtime);

  if (!result.compatible) {
    throw new CompatibilityValidationError(result.issues);
  }
}
