import { PlatformSdkError } from './platform-sdk.error.js';

/**
 * @stable
 * Structured issue captured during manifest validation.
 */
export interface IManifestValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path: string;
}

/**
 * @stable
 * Manifest validation failure with machine-readable issue details.
 */
export class ManifestValidationError extends PlatformSdkError {
  constructor(readonly issues: readonly IManifestValidationIssue[]) {
    super(
      'MANIFEST_VALIDATION_FAILED',
      'Platform module manifest validation failed.',
      { issues },
    );

    this.name = 'ManifestValidationError';
    this.issues = issues;
  }
}
