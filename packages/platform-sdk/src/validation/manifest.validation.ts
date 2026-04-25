import type { ZodIssue } from 'zod';
import type { IPlatformModuleManifest } from '../interfaces/index.js';
import {
  ManifestValidationError,
  type IManifestValidationIssue,
} from '../errors/index.js';
import { PlatformModuleManifestSchema } from '../schemas/index.js';

/**
 * @alpha
 * Successful manifest validation result.
 */
export interface IManifestValidationSuccess {
  readonly success: true;
  readonly manifest: IPlatformModuleManifest;
}

/**
 * @alpha
 * Failed manifest validation result.
 */
export interface IManifestValidationFailure {
  readonly success: false;
  readonly error: ManifestValidationError;
}

/**
 * @alpha
 * Discriminated union for manifest validation outcomes.
 */
export type ManifestValidationResultType =
  | IManifestValidationSuccess
  | IManifestValidationFailure;

function toManifestValidationIssue(issue: ZodIssue): IManifestValidationIssue {
  return {
    code: issue.code,
    message: issue.message,
    path: !issue.path.length ? '$' : issue.path.join('.'),
  };
}

function collectDuplicates(values: readonly string[]): string[] {
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

function collectSemanticIssues(manifest: IPlatformModuleManifest): IManifestValidationIssue[] {
  const issues: IManifestValidationIssue[] = [];
  const duplicateCapabilities = collectDuplicates(manifest.capabilities);

  for (const capability of duplicateCapabilities) {
    issues.push({
      code: 'duplicate_capability',
      message: `Capability "${capability}" is declared more than once.`,
      path: 'capabilities',
    });
  }

  const dependencyIds = manifest.dependencies.map((dependency) => dependency.id);
  const duplicateDependencies = collectDuplicates(dependencyIds);

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

/**
 * @alpha
 * Validates a module manifest and returns a typed success or failure result.
 */
export function safeValidatePlatformModuleManifest(manifest: unknown): ManifestValidationResultType {
  const parsed = PlatformModuleManifestSchema.safeParse(manifest);

  if (!parsed.success) {
    return {
      success: false,
      error: new ManifestValidationError(parsed.error.issues.map(toManifestValidationIssue)),
    };
  }

  const semanticIssues = collectSemanticIssues(parsed.data);

  if (semanticIssues.length) {
    return {
      success: false,
      error: new ManifestValidationError(semanticIssues),
    };
  }

  return {
    success: true,
    manifest: parsed.data,
  };
}

/**
 * @alpha
 * Validates a module manifest and throws on invalid input.
 */
export function parsePlatformModuleManifest(manifest: unknown): IPlatformModuleManifest {
  const result = safeValidatePlatformModuleManifest(manifest);

  if (!result.success) {
    throw result.error;
  }

  return result.manifest;
}
