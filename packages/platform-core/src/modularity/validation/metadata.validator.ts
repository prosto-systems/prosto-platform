import {
  type IPlatformModuleManifest,
  MODULE_CRITICALITY_LEVELS,
  MODULE_SECURITY_CLASSES,
} from '@prosto/platform-sdk';

/**
 * Individual validation issue.
 */
export interface IMetadataValidationIssue {
  /**
   * Field path that has the issue.
   */
  readonly field: string;
  /**
   * Issue code for programmatic handling.
   */
  readonly code: MetadataValidationCode;
  /**
   * Human-readable message.
   */
  readonly message: string;
  /**
   * Suggested fix for the issue.
   */
  readonly remediationHint: string;
}

/**
 * Validation result for metadata checks.
 */
export interface IMetadataValidationResult {
  /**
   * Whether the metadata is valid.
   */
  readonly valid: boolean;
  /**
   * List of validation issues found.
   */
  readonly issues: IMetadataValidationIssue[];
}

/**
 * Issue codes for metadata validation failures.
 */
export enum MetadataValidationCode {
  /**
   * Required field is missing.
   */
  MissingRequiredField = 'MISSING_REQUIRED_FIELD',
  /**
   * Field has an invalid value.
   */
  InvalidFieldValue = 'INVALID_FIELD_VALUE',
  /**
   * Security classification is missing.
   */
  MissingSecurityClassification = 'MISSING_SECURITY_CLASSIFICATION',
  /**
   * Integrity evidence is missing.
   */
  MissingIntegrityEvidence = 'MISSING_INTEGRITY_EVIDENCE',
  /**
   * Checksum format is invalid.
   */
  InvalidChecksumFormat = 'INVALID_CHECKSUM_FORMAT',
  /**
   * Signature format is invalid.
   */
  InvalidSignatureFormat = 'INVALID_SIGNATURE_FORMAT',
  /**
   * Criticality level is missing.
   */
  MissingCriticality = 'MISSING_CRITICALITY',
  /**
   * Capabilities array is empty for a module claiming capabilities.
   */
  EmptyCapabilities = 'EMPTY_CAPABILITIES',
}

/**
 * Options for metadata validation.
 */
export interface IMetadataValidationOptions {
  /**
   * Whether to require integrity evidence (checksum or signature).
   * @default true
   */
  requireIntegrity?: boolean;
  /**
   * Whether to validate checksum format if present.
   * @default true
   */
  validateChecksumFormat?: boolean;
  /**
   * Environment tier for validation strictness.
   * @default 'production'
   */
  environment?: 'production' | 'development' | 'test';
}

/**
 * @alpha
 * Validates module manifest metadata for security compliance.
 * Ensures manifests contain required security fields and valid values.
 */
export class MetadataValidator {
  private readonly _options: IMetadataValidationOptions;

  constructor(options: IMetadataValidationOptions = {}) {
    this._options = {
      requireIntegrity: true,
      validateChecksumFormat: true,
      environment: 'production',
      ...options,
    };
  }

  /**
   * Validate all security-related metadata in a module manifest.
   */
  validate(manifest: IPlatformModuleManifest): IMetadataValidationResult {
    const issues: IMetadataValidationIssue[] = [];

    // Validate security classification
    const securityIssues = this._validateSecurityClass(manifest);
    issues.push(...securityIssues);

    // Validate criticality
    const criticalityIssues = this._validateCriticality(manifest);
    issues.push(...criticalityIssues);

    // Validate integrity evidence if required
    if (this._options.requireIntegrity) {
      const integrityIssues = this._validateIntegrityEvidence(manifest);
      issues.push(...integrityIssues);
    }

    // Validate checksum format if present and validation enabled
    if (this._options.validateChecksumFormat && manifest.checksum) {
      const checksumIssues = this._validateChecksumFormat(manifest.checksum);
      issues.push(...checksumIssues);
    }

    // Validate signature format if present
    if (manifest.signature) {
      const signatureIssues = this._validateSignatureFormat(manifest.signature);
      issues.push(...signatureIssues);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Check if a security class value is valid.
   */
  isValidSecurityClass(value: string): boolean {
    return MODULE_SECURITY_CLASSES.includes(
      value as (typeof MODULE_SECURITY_CLASSES)[number],
    );
  }

  /**
   * Check if a criticality value is valid.
   */
  isValidCriticality(value: string): boolean {
    return MODULE_CRITICALITY_LEVELS.includes(
      value as (typeof MODULE_CRITICALITY_LEVELS)[number],
    );
  }

  /**
   * Validate security classification field.
   */
  private _validateSecurityClass(
    manifest: IPlatformModuleManifest,
  ): IMetadataValidationIssue[] {
    const issues: IMetadataValidationIssue[] = [];

    if (!manifest.securityClass) {
      issues.push({
        field: 'securityClass',
        code: MetadataValidationCode.MissingSecurityClassification,
        message: `Module "${manifest.id}" is missing security classification.`,
        remediationHint: `Add "securityClass" field with value: ${MODULE_SECURITY_CLASSES.join(' | ')}.`,
      });
    } else if (!this.isValidSecurityClass(manifest.securityClass)) {
      issues.push({
        field: 'securityClass',
        code: MetadataValidationCode.InvalidFieldValue,
        message: `Module "${manifest.id}" has invalid security class: "${manifest.securityClass}".`,
        remediationHint: `Use a valid security class: ${MODULE_SECURITY_CLASSES.join(' | ')}.`,
      });
    }

    return issues;
  }

  /**
   * Validate criticality field.
   */
  private _validateCriticality(
    manifest: IPlatformModuleManifest,
  ): IMetadataValidationIssue[] {
    const issues: IMetadataValidationIssue[] = [];

    if (!manifest.criticality) {
      issues.push({
        field: 'criticality',
        code: MetadataValidationCode.MissingCriticality,
        message: `Module "${manifest.id}" is missing criticality level.`,
        remediationHint: `Add "criticality" field with value: ${MODULE_CRITICALITY_LEVELS.join(' | ')}.`,
      });
    } else if (!this.isValidCriticality(manifest.criticality)) {
      issues.push({
        field: 'criticality',
        code: MetadataValidationCode.InvalidFieldValue,
        message: `Module "${manifest.id}" has invalid criticality: "${manifest.criticality}".`,
        remediationHint: `Use a valid criticality: ${MODULE_CRITICALITY_LEVELS.join(' | ')}.`,
      });
    }

    return issues;
  }

  /**
   * Validate integrity evidence (checksum or signature).
   */
  private _validateIntegrityEvidence(
    manifest: IPlatformModuleManifest,
  ): IMetadataValidationIssue[] {
    const issues: IMetadataValidationIssue[] = [];

    if (!manifest.checksum && !manifest.signature) {
      issues.push({
        field: 'checksum',
        code: MetadataValidationCode.MissingIntegrityEvidence,
        message: `Module "${manifest.id}" has no integrity evidence.`,
        remediationHint:
          'Provide checksum (sha256:<hex>) and/or signature for artifact integrity verification.',
      });
    }

    return issues;
  }

  /**
   * Validate checksum format.
   */
  private _validateChecksumFormat(
    checksum: string,
  ): IMetadataValidationIssue[] {
    const issues: IMetadataValidationIssue[] = [];

    // Supported formats:
    // - sha256:<hex> or sha256-<base64>
    // - sha512:<hex> or sha512-<base64>
    // - <hex> (64 chars for sha256, 128 for sha512)
    const algorithmPattern = /^(sha256|sha512|sha1)[-:]/i;
    const hex256Pattern = /^[a-fA-F0-9]{64}$/;
    const hex512Pattern = /^[a-fA-F0-9]{128}$/;
    const hex1Pattern = /^[a-fA-F0-9]{40}$/;

    if (
      !algorithmPattern.test(checksum) &&
      !hex256Pattern.test(checksum) &&
      !hex512Pattern.test(checksum) &&
      !hex1Pattern.test(checksum)
    ) {
      issues.push({
        field: 'checksum',
        code: MetadataValidationCode.InvalidChecksumFormat,
        message: `Invalid checksum format: "${checksum}".`,
        remediationHint:
          'Use format: sha256:<hex> or sha256-<base64>, or plain hex (64 chars for sha256).',
      });
    }

    return issues;
  }

  /**
   * Validate signature format (basic structure check).
   */
  private _validateSignatureFormat(
    signature: string,
  ): IMetadataValidationIssue[] {
    const issues: IMetadataValidationIssue[] = [];

    // Signature should be a non-empty base64 string
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;

    if (!signature || signature.trim().length === 0) {
      issues.push({
        field: 'signature',
        code: MetadataValidationCode.InvalidSignatureFormat,
        message: 'Signature is empty.',
        remediationHint: 'Provide a valid base64-encoded signature.',
      });
    } else if (!base64Pattern.test(signature)) {
      issues.push({
        field: 'signature',
        code: MetadataValidationCode.InvalidSignatureFormat,
        message: `Invalid signature format: "${signature}".`,
        remediationHint: 'Signature must be a valid base64-encoded string.',
      });
    }

    return issues;
  }
}
