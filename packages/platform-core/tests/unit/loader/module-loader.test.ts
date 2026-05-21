import { describe, expect, it } from 'vitest';
import { ModuleLoader } from '@/loader/index.js';
import { RuntimeReasonCodes } from '@/runtime/index.js';
import { createManifest, TestModule } from '@/tests/fixtures/index.js';

describe('ModuleLoader', () => {
  const loader = new ModuleLoader();

  it('loads memory candidates', async () => {
    const result = await loader.load([
      { type: 'memory', module: new TestModule(createManifest({ id: 'module-a' })) },
    ]);

    expect(result.loaded).toHaveLength(1);
    expect(result.rejected).toEqual([]);
    expect(result.loaded[0]?.moduleId).toBe('module-a');
  });

  it('rejects url candidates on fetch failure', async () => {
    const result = await loader.load([
      {
        type: 'url',
        moduleIdHint: 'module-url',
        url: 'https://example.invalid/module.zip',
      },
    ]);

    expect(result.loaded).toEqual([]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.reasonCode).toBe(RuntimeReasonCodes.SourceFetchFailed);
    expect(result.rejected[0]?.phase).toBe('discover');
  });

  it('rejects insecure url source at discover phase', async () => {
    const result = await loader.load([
      {
        type: 'url',
        moduleIdHint: 'module-url',
        url: 'http://example.invalid/module.zip',
      },
    ]);

    expect(result.loaded).toEqual([]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.reasonCode).toBe(RuntimeReasonCodes.SourceUrlInvalid);
    expect(result.rejected[0]?.phase).toBe('discover');
  });
});
