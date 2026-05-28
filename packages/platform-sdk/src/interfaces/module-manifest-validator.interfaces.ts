import type { ManifestValidationError } from '@/errors/index.js';
import type { IPlatformModuleManifest } from './platform-module-manifest.interfaces.js';

/**
 * @alpha
 * Successful manifest validation result.
 */
export interface IModuleManifestValidationSuccess {
  readonly success: true;
  readonly manifest: IPlatformModuleManifest;
}

/**
 * @alpha
 * Failed manifest validation result.
 */
export interface IModuleManifestValidationFailure {
  readonly success: false;
  readonly error: ManifestValidationError;
}

/**
 * @alpha
 * Discriminated union for manifest validation outcomes.
 */
export type ModuleManifestValidationResultType =
  | IModuleManifestValidationSuccess
  | IModuleManifestValidationFailure;

/**
 * @alpha
 * Contract for manifest validation operations.
 */
export interface IModuleManifestValidator {
  validate(manifest: unknown): ModuleManifestValidationResultType;
  parse(manifest: unknown): IPlatformModuleManifest;
}
