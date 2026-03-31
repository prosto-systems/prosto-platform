import { describe, expect, it } from 'vitest';

import {
  CompatibilityValidationError,
  assertManifestCompatibility,
  type IPlatformModuleManifest,
  parsePlatformModuleManifest,
  validateManifestCompatibility,
} from '../src/index.js';

const validManifest: IPlatformModuleManifest = {
  id: 'module-health',
  version: '1.2.3',
  sdkVersion: '^0.1.0',
  criticality: 'normal',
  securityClass: 'internal',
  capabilities: ['feature.health', 'obs.metrics'],
  dependencies: [{ id: 'module-auth', version: '^1.0.0' }],
};

describe('compatibility validation', () => {
  it('returns compatible for matching ranges', () => {
    const manifest = parsePlatformModuleManifest(validManifest);
    const result = validateManifestCompatibility(manifest, {
      sdkVersion: '0.1.5',
    });

    expect(result.compatible).toBe(true);
  });

  it('returns mismatch details for incompatible SDK version', () => {
    const manifest = parsePlatformModuleManifest(validManifest);
    const result = validateManifestCompatibility(manifest, {
      sdkVersion: '0.2.0',
    });

    expect(result.compatible).toBe(false);

    if (result.compatible) {
      throw new Error('Expected compatibility mismatch.');
    }

    expect(result.issues[0]?.field).toBe('sdkVersion');
    expect(result.issues[0]?.code).toBe('VERSION_RANGE_MISMATCH');
  });

  it('throws CompatibilityValidationError on mismatch', () => {
    const manifest = parsePlatformModuleManifest(validManifest);

    expect(() =>
      assertManifestCompatibility(manifest, {
        sdkVersion: '1.2.0',
      }),
    ).toThrow(CompatibilityValidationError);
  });
});
