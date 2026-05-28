import { describe, expect, it } from 'vitest';
import {
  type IPlatformModuleManifest,
  ManifestValidationError,
  PlatformModuleManifestValidator,
} from '../../src/index.js';

const validManifest: IPlatformModuleManifest = {
  id: 'module-health',
  version: '1.2.3',
  sdkVersion: '^0.1.0',
  criticality: 'normal',
  securityClass: 'internal',
  capabilities: ['feature.health', 'obs.metrics'],
  dependencies: [{ id: 'module-auth', version: '^1.0.0' }],
};

describe('manifest validation', () => {
  const manifestValidator = new PlatformModuleManifestValidator();

  it('accepts a valid manifest', () => {
    const parsedManifest = manifestValidator.parse(validManifest);

    expect(parsedManifest.id).toBe(validManifest.id);
    expect(parsedManifest.version).toBe(validManifest.version);
  });

  it('returns failure for schema violations', () => {
    const result = manifestValidator.validate({
      ...validManifest,
      capabilities: [],
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected validation failure.');
    }

    expect(result.error).toBeInstanceOf(ManifestValidationError);
    expect(
      result.error.issues.some((issue) => issue.path === 'capabilities'),
    ).toBe(true);
  });

  it('returns failure for duplicate capabilities', () => {
    const result = manifestValidator.validate({
      ...validManifest,
      capabilities: ['feature.health', 'feature.health'],
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected validation failure.');
    }

    expect(
      result.error.issues.some(
        (issue) => issue.code === 'duplicate_capability',
      ),
    ).toBe(true);
  });
});
