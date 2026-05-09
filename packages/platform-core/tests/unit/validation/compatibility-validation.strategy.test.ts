import { describe, expect, it } from 'vitest';
import { CompatibilityValidationStrategy } from '@/validation/index.js';
import {
  ModuleArtifactPackaging,
  ModuleArtifactSource,
} from '@/loader/index.js';
import { createManifest, TestModule } from '@/tests/fixtures/index.js';

describe('CompatibilityValidationStrategy', () => {
  it('fails when runtime sdkVersion does not satisfy module sdkVersion range', () => {
    const strategy = new CompatibilityValidationStrategy();
    const module = new TestModule(
      createManifest({ id: 'module-a', sdkVersion: '^1.0.0' }),
    );

    const result = strategy.validate({
      artifact: {
        module,
        moduleId: module.manifest.id,
        moduleVersion: module.manifest.version,
        orderingKey: 'memory:module-a@1.0.0',
        sourceType: ModuleArtifactSource.Memory,
        sourceRef: 'memory:module-a@1.0.0',
        packaging: ModuleArtifactPackaging.Esm,
      },
      runtimeVersion: {
        sdkVersion: '0.0.0',
        nodeVersion: process.versions.node,
      },
    });

    expect('error' in result).toBe(true);
  });
});
