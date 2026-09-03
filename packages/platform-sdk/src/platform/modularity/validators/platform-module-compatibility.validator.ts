import type {
  PlatformModuleCompatibilityValidationResultType,
  IPlatformModuleCompatibilityValidator,
  IPlatformModuleManifest,
  IPlatformRuntimeVersionContext,
} from '../interfaces/index.js';
import {
  PlatformModuleCompatibilityValidationError,
  type IPlatformModuleCompatibilityValidationIssue,
} from '../errors/index.js';
import { isSemverSatisfied, isSemverVersion } from '@/utils/index.js';

/**
 * @alpha
 * Validates runtime semantic versions against module compatibility ranges.
 *
 * Runtime version values are validated first. The SDK version is always
 * checked against `manifest.sdkVersion`; Node.js is checked only when the
 * manifest declares `nodeVersion`.
 */
export class PlatformModuleCompatibilityValidator implements IPlatformModuleCompatibilityValidator {
  /**
   * Returns all runtime-version issues found before the first range mismatch.
   */
  validate(
    manifest: IPlatformModuleManifest,
    runtime: IPlatformRuntimeVersionContext,
  ): PlatformModuleCompatibilityValidationResultType {
    const issues: IPlatformModuleCompatibilityValidationIssue[] = [];

    issues.push(
      ...this._validateRuntimeVersion('sdkVersion', runtime.sdkVersion),
    );
    issues.push(
      ...this._validateRuntimeVersion('nodeVersion', runtime.nodeVersion),
    );

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
          message:
            'Manifest requires nodeVersion but runtime context did not provide it.',
          expectedRange: manifest.nodeVersion,
        });
      } else if (
        !isSemverSatisfied(runtime.nodeVersion, manifest.nodeVersion)
      ) {
        issues.push({
          field: 'nodeVersion',
          code: 'VERSION_RANGE_MISMATCH',
          message:
            'Runtime nodeVersion is outside the manifest nodeVersion range.',
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
   * Asserts that a manifest supports the supplied runtime versions.
   *
   * @throws PlatformModuleCompatibilityValidationError when compatibility
   * validation fails.
   */
  assert(
    manifest: IPlatformModuleManifest,
    runtime: IPlatformRuntimeVersionContext,
  ): void {
    const result = this.validate(manifest, runtime);

    if (!result.compatible) {
      throw new PlatformModuleCompatibilityValidationError(result.issues);
    }
  }

  protected _validateRuntimeVersion(
    field: keyof IPlatformRuntimeVersionContext,
    version?: string,
  ): IPlatformModuleCompatibilityValidationIssue[] {
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
}
