import { describe, expect, it } from 'vitest';
import { MemorySource } from '@/modularity/index.js';
import { createManifest, TestModule } from '@/tests/fixtures/index.js';

describe('MemorySource', () => {
  it('validates and loads in-memory module artifact', async () => {
    const source = new MemorySource({
      type: 'memory',
      module: new TestModule(createManifest({ id: 'module-a' })),
    });

    expect(source.validate()).toEqual({ ok: true });

    const result = await source.load();

    if ('reasonCode' in result) {
      throw new Error(
        'Expected load to succeed, but it failed with reason: ' +
          result.reasonCode,
      );
    }

    expect(result.moduleId).toBe('module-a');
    expect(result.sourceType).toBe('memory');
  });
});
