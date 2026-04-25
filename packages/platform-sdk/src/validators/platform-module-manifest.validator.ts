import type { ZodIssue, ZodObject } from 'zod';
import type {
  IModuleManifestValidator,
  IPlatformModuleManifest,
  ModuleManifestValidationResultType,
} from '../interfaces/index.js';
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
    protected readonly manifestSchema: ZodObject = PlatformModuleManifestSchema,
  ) {
  }

  validate(manifest: unknown): ModuleManifestValidationResultType {
    const schemaResult = this.validateManifestSchema(this.manifestSchema, manifest);

    if (!schemaResult.success) {
      return schemaResult;
    }

    const semanticIssues = this.validateManifestSemantics(schemaResult.manifest);

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

  protected toManifestValidationIssue(
    issue: ZodIssue,
  ): IManifestValidationIssue {
    return {
      code: issue.code,
      message: issue.message,
      path: !issue.path.length ? '$' : issue.path.join('.'),
    };
  }

  protected collectDuplicates(values: readonly string[]): string[] {
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

  protected validateManifestSchema(
    manifestSchema: ZodObject,
    manifest: unknown,
  ): ModuleManifestValidationResultType {
    const parsed = manifestSchema.safeParse(manifest);

    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (issue) => this.toManifestValidationIssue(issue),
      );

      return {
        success: false,
        error: new ManifestValidationError(issues),
      };
    }

    return {
      success: true,
      manifest: parsed.data as unknown as IPlatformModuleManifest,
    };
  }

  protected validateManifestSemantics(
    manifest: IPlatformModuleManifest,
  ): IManifestValidationIssue[] {
    const issues: IManifestValidationIssue[] = [];
    const duplicateCapabilities = this.collectDuplicates(manifest.capabilities);

    for (const capability of duplicateCapabilities) {
      issues.push({
        code: 'duplicate_capability',
        message: `Capability "${capability}" is declared more than once.`,
        path: 'capabilities',
      });
    }

    const dependencyIds = manifest.dependencies.map(
      (dependency) => dependency.id,
    );
    const duplicateDependencies = this.collectDuplicates(dependencyIds);

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

    return issues;
  }
}
