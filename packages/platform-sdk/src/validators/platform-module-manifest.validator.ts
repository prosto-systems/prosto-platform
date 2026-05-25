import type { ZodIssue, ZodType } from 'zod';
import type {
  IModuleManifestValidator,
  IPlatformModuleManifest,
  ModuleManifestValidationResultType,
} from '../interfaces/index.js';
import type { ModuleCapabilityType } from '../types/index.js';
import { MODULE_CAPABILITY_PATTERN } from '../constants/index.js';
import {
  type IManifestValidationIssue,
  ManifestValidationError,
} from '../errors/index.js';
import { PlatformModuleManifestSchema } from '../schemas/index.js';

/**
 * @alpha
 * The default implementation of platform module manifest validation.
 */
export class PlatformModuleManifestValidator implements IModuleManifestValidator {
  constructor(
    protected readonly manifestSchema: ZodType<IPlatformModuleManifest> = PlatformModuleManifestSchema,
  ) {
  }

  validate(manifest: unknown): ModuleManifestValidationResultType {
    const schemaResult = this._validateManifestSchema(this.manifestSchema, manifest);

    if (!schemaResult.success) {
      return schemaResult;
    }

    const semanticIssues = this._validateManifestSemantics(schemaResult.manifest);

    if (semanticIssues.length) {
      return {
        success: false,
        error: new ManifestValidationError(semanticIssues),
      };
    }

    return schemaResult;
  }

  parse(manifest: unknown): IPlatformModuleManifest {
    const result = this.validate(manifest);

    if (!result.success) {
      throw result.error;
    }

    return result.manifest;
  }

  protected _toManifestValidationIssue(
    issue: ZodIssue,
  ): IManifestValidationIssue {
    return {
      code: issue.code,
      message: issue.message,
      path: !issue.path.length ? '$' : issue.path.join('.'),
    };
  }

  protected _collectDuplicates(values: readonly string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const value of values) {
      if (seen.has(value)) {
        duplicates.add(value);
        continue;
      }

      seen.add(value);
    }

    return [...duplicates];
  }

  protected _validateManifestSchema(
    manifestSchema: ZodType<IPlatformModuleManifest>,
    manifest: unknown,
  ): ModuleManifestValidationResultType {
    const parsed = manifestSchema.safeParse(manifest);

    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (issue) => this._toManifestValidationIssue(issue),
      );

      return {
        success: false,
        error: new ManifestValidationError(issues),
      };
    }

    return {
      success: true,
      manifest: parsed.data,
    };
  }

  protected _validateManifestSemantics(
    manifest: IPlatformModuleManifest,
  ): IManifestValidationIssue[] {
    const issues: IManifestValidationIssue[] = [];

    const dependencyIds = manifest.dependencies.map(
      (dependency) => dependency.id,
    );
    const duplicateDependencies = this._collectDuplicates(dependencyIds);

    for (const dependencyId of duplicateDependencies) {
      issues.push({
        code: 'duplicate_dependency',
        message: `Dependency "${dependencyId}" is declared more than once.`,
        path: 'dependencies',
      });
    }

    if (dependencyIds.includes(manifest.id)) {
      issues.push({
        code: 'self_dependency',
        message: 'Manifest dependencies must not reference the module itself.',
        path: 'dependencies',
      });
    }

    const duplicateCapabilities = this._collectDuplicates(manifest.capabilities);

    for (const capability of duplicateCapabilities) {
      issues.push({
        code: 'duplicate_capability',
        message: `Capability "${capability}" is declared more than once.`,
        path: 'capabilities',
      });
    }

    const uniqCapabilities = [...new Set(manifest.capabilities)];
    const capabilityIssues = this._validateCapabilities(uniqCapabilities);

    if (capabilityIssues.length) {
      issues.push(...capabilityIssues);
    }

    return issues;
  }

  protected _validateCapabilities(
    capabilities: readonly ModuleCapabilityType[],
  ): IManifestValidationIssue[] {
    const issues: IManifestValidationIssue[] = [];

    for (const capability of capabilities) {
      // Validate capability format matches the standard pattern
      if (!MODULE_CAPABILITY_PATTERN.test(capability)) {
        issues.push({
          code: 'invalid_capability_format',
          message: `Capability "${capability}" has invalid format. Must match pattern: ${MODULE_CAPABILITY_PATTERN.source}`,
          path: 'capabilities',
        });

        continue;
      }

      const isConfigCapability = capability.startsWith('config.');

      // Check for wildcard patterns (forbidden)
      if (isConfigCapability && capability.includes('*')) {
        issues.push({
          code: 'wildcard_config_capability_forbidden',
          message: `Wildcard patterns are forbidden in config capabilities: "${capability}"`,
          path: 'capabilities',
        });
      }
    }

    return issues;
  }
}
