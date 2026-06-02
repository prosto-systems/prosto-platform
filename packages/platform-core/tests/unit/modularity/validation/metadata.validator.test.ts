import { describe, expect, it } from 'vitest';
import type {
  IPlatformModuleManifest,
  ModuleCriticalityType,
  ModuleSecurityClassType,
} from '@prosto/platform-sdk';
import {
  type IMetadataValidationOptions,
  MetadataValidationCode,
  MetadataValidator,
} from '@/index.js';

// Helper to create a test manifest
function createTestManifest(
  overrides: Partial<IPlatformModuleManifest> = {},
): IPlatformModuleManifest {
  return {
    id: 'test-module',
    version: '1.0.0',
    sdkVersion: '^0.1.0',
    criticality: 'standard',
    securityClass: 'internal',
    capabilities: [],
    dependencies: [],
    ...overrides,
  };
}

/**
 * Create a new metadata validator with default options.
 */
export function createMetadataValidator(
  options?: IMetadataValidationOptions,
): MetadataValidator {
  return new MetadataValidator(options);
}

/**
 * Create a production-grade metadata validator with strict settings.
 */
export function createProductionMetadataValidator(): MetadataValidator {
  return new MetadataValidator({
    requireIntegrity: true,
    validateChecksumFormat: true,
    environment: 'production',
  });
}

/**
 * Create a development-grade metadata validator with relaxed settings.
 */
export function createDevelopmentMetadataValidator(): MetadataValidator {
  return new MetadataValidator({
    requireIntegrity: false,
    validateChecksumFormat: false,
    environment: 'development',
  });
}

describe('MetadataValidator', () => {
  describe('validate', () => {
    it('should validate correct manifest', () => {
      const validator = createMetadataValidator({ requireIntegrity: false });
      const manifest = createTestManifest();

      const result = validator.validate(manifest);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing security class', () => {
      const validator = createMetadataValidator({ requireIntegrity: false });
      const manifest = createTestManifest({
        securityClass: undefined as unknown as ModuleSecurityClassType,
      });

      const result = validator.validate(manifest);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) =>
            i.code === MetadataValidationCode.MissingSecurityClassification,
        ),
      ).toBe(true);
    });

    it('should detect invalid security class', () => {
      const validator = createMetadataValidator({ requireIntegrity: false });
      const manifest = createTestManifest({
        securityClass: 'invalid' as unknown as ModuleSecurityClassType,
      });

      const result = validator.validate(manifest);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === MetadataValidationCode.InvalidFieldValue,
        ),
      ).toBe(true);
    });

    it('should detect missing criticality', () => {
      const validator = createMetadataValidator({ requireIntegrity: false });
      const manifest = createTestManifest({
        criticality: undefined as unknown as ModuleCriticalityType,
      });

      const result = validator.validate(manifest);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === MetadataValidationCode.MissingCriticality,
        ),
      ).toBe(true);
    });

    it('should detect invalid criticality', () => {
      const validator = createMetadataValidator({ requireIntegrity: false });
      const manifest = createTestManifest({
        criticality: 'invalid' as unknown as ModuleCriticalityType,
      });

      const result = validator.validate(manifest);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === MetadataValidationCode.InvalidFieldValue,
        ),
      ).toBe(true);
    });

    it('should detect missing integrity evidence when required', () => {
      const validator = createMetadataValidator({ requireIntegrity: true });
      const manifest = createTestManifest();

      const result = validator.validate(manifest);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === MetadataValidationCode.MissingIntegrityEvidence,
        ),
      ).toBe(true);
    });

    it('should not require integrity when disabled', () => {
      const validator = createMetadataValidator({ requireIntegrity: false });
      const manifest = createTestManifest();

      const result = validator.validate(manifest);

      expect(result.valid).toBe(true);
    });

    it('should validate checksum format', () => {
      const validator = createMetadataValidator({
        requireIntegrity: false,
        validateChecksumFormat: true,
      });
      const manifest = createTestManifest({ checksum: 'invalid-format' });

      const result = validator.validate(manifest);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === MetadataValidationCode.InvalidChecksumFormat,
        ),
      ).toBe(true);
    });

    it('should accept valid sha256 hex checksum', () => {
      const validator = createMetadataValidator({
        requireIntegrity: false,
        validateChecksumFormat: true,
      });
      const manifest = createTestManifest({ checksum: 'a'.repeat(64) });

      const result = validator.validate(manifest);

      expect(result.valid).toBe(true);
    });

    it('should accept valid npm-style checksum', () => {
      const validator = createMetadataValidator({
        requireIntegrity: false,
        validateChecksumFormat: true,
      });
      const manifest = createTestManifest({ checksum: 'sha256-abc123==' });

      const result = validator.validate(manifest);

      expect(result.valid).toBe(true);
    });

    it('should detect invalid signature format', () => {
      const validator = createMetadataValidator({ requireIntegrity: false });
      const manifest = createTestManifest({ signature: 'not-base64!@#' });

      const result = validator.validate(manifest);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === MetadataValidationCode.InvalidSignatureFormat,
        ),
      ).toBe(true);
    });
  });

  describe('isValidSecurityClass', () => {
    it('should validate known security classes', () => {
      const validator = new MetadataValidator();

      expect(validator.isValidSecurityClass('trusted')).toBe(true);
      expect(validator.isValidSecurityClass('internal')).toBe(true);
      expect(validator.isValidSecurityClass('third-party-reviewed')).toBe(true);
    });

    it('should reject unknown security classes', () => {
      const validator = new MetadataValidator();

      expect(validator.isValidSecurityClass('unknown')).toBe(false);
      expect(validator.isValidSecurityClass('')).toBe(false);
    });
  });

  describe('isValidCriticality', () => {
    it('should validate known criticality levels', () => {
      const validator = new MetadataValidator();

      expect(validator.isValidCriticality('critical')).toBe(true);
      expect(validator.isValidCriticality('standard')).toBe(true);
    });

    it('should reject unknown criticality levels', () => {
      const validator = new MetadataValidator();

      expect(validator.isValidCriticality('unknown')).toBe(false);
    });
  });

  describe('factory functions', () => {
    it('should create production validator with strict settings', () => {
      const validator = createProductionMetadataValidator();

      // Production validator should require integrity
      const result = validator.validate(createTestManifest());
      expect(result.valid).toBe(false);
    });

    it('should create development validator with relaxed settings', () => {
      const validator = createDevelopmentMetadataValidator();

      // Development validator should not require integrity
      const result = validator.validate(createTestManifest());
      expect(result.valid).toBe(true);
    });
  });
});
