import type { ICompatibilityValidationIssue } from '../errors/index.js';
import type {
  IPlatformModuleManifest,
} from './platform-module-manifest.interfaces.js';

/**
 * @alpha
 * Runtime version context used for manifest compatibility checks.
 */
export interface IPlatformRuntimeVersionContext {
  readonly sdkVersion: string;
  readonly nodeVersion?: string;
}

/**
 * @alpha
 * Successful compatibility validation result.
 */
export interface IModuleCompatibilityValidationSuccess {
  readonly compatible: true;
  readonly issues: readonly [];
}

/**
 * @alpha
 * Failed compatibility validation result.
 */
export interface IModuleCompatibilityValidationFailure {
  readonly compatible: false;
  readonly issues: readonly ICompatibilityValidationIssue[];
}

/**
 * @alpha
 * Compatibility validation result union.
 */
export type ModuleCompatibilityValidationResultType =
  | IModuleCompatibilityValidationSuccess
  | IModuleCompatibilityValidationFailure;

/**
 * @alpha
 * Contract for runtime compatibility validation.
 */
export interface IModuleCompatibilityValidator {
  validate(
    manifest: IPlatformModuleManifest,
    runtime: IPlatformRuntimeVersionContext,
  ): ModuleCompatibilityValidationResultType;

  assert(
    manifest: IPlatformModuleManifest,
    runtime: IPlatformRuntimeVersionContext,
  ): void;
}
