import { PlatformSdkError } from './platform-sdk.error.js';

/**
 * @alpha
 * Compatibility fields validated against runtime versions.
 */
export type CompatibilityFieldType =
  | 'sdkVersion'
  | 'nodeVersion';

/**
 * @alpha
 * Compatibility issue code taxonomy.
 */
export type CompatibilityIssueCodeType =
  | 'VERSION_RANGE_MISMATCH'
  | 'RUNTIME_VERSION_MISSING'
  | 'RUNTIME_VERSION_INVALID';

/**
 * @alpha
 * Structured compatibility mismatch detail.
 */
export interface ICompatibilityValidationIssue {
  readonly field: CompatibilityFieldType;
  readonly code: CompatibilityIssueCodeType;
  readonly message: string;
  readonly expectedRange: string;
  readonly actualVersion?: string;
}

/**
 * @alpha
 * Compatibility validation failure with detailed mismatch metadata.
 */
export class CompatibilityValidationError extends PlatformSdkError {
  constructor(readonly issues: readonly ICompatibilityValidationIssue[]) {
    super(
      'COMPATIBILITY_VALIDATION_FAILED',
      'Module compatibility validation failed.',
      { issues },
    );

    this.name = 'CompatibilityValidationError';
    this.issues = issues;
  }
}
