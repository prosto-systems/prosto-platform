import { describe, expect, it } from 'vitest';
import {
  ManifestValidationStrategy,
  ModuleArtifactPackaging,
  ModuleArtifactSource,
} from '@/modularity/index.js';
import { createManifest, TestModule } from '@/tests/fixtures/index.js';

describe('ManifestValidationStrategy', () => {
  it('passes valid manifest', () => {
    const strategy = new ManifestValidationStrategy();
    const module = new TestModule(createManifest({ id: 'module-a' }));

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

    expect(result).toEqual({ ok: true });
  });

  it('fails invalid manifest', () => {
    const strategy = new ManifestValidationStrategy();
    const module = new TestModule(createManifest({ id: 'INVALID_ID' }));

    const result = strategy.validate({
      artifact: {
        module,
        moduleId: module.manifest.id,
        moduleVersion: module.manifest.version,
        orderingKey: 'memory:INVALID_ID@1.0.0',
        sourceType: ModuleArtifactSource.Memory,
        sourceRef: 'memory:INVALID_ID@1.0.0',
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
