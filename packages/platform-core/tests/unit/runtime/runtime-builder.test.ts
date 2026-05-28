import { describe, expect, it } from 'vitest';
import { RuntimeStartupStatus } from '@/diagnostics/index.js';
import { RuntimeBuilder } from '@/runtime/index.js';
import { createManifest, TestModule } from '@/tests/fixtures/index.js';

describe('RuntimeBuilder', () => {
  it('builds runtime and wires startup/shutdown flow', async () => {
    const runtime = new RuntimeBuilder().build({
      modules: [
        {
          type: 'memory',
          module: new TestModule(createManifest({ id: 'module-a' })),
        },
      ],
    });

    await runtime.start();

    expect(runtime.started).toBe(true);
    expect(runtime.stopped).toBe(false);
    expect(runtime.startedModuleIds).toEqual(['module-a']);
    expect(runtime.reports.startup?.status).toEqual(
      RuntimeStartupStatus.Success,
    );

    await runtime.stop();

    expect(runtime.stopped).toBe(true);
    expect(runtime.started).toBe(false);
    expect(runtime.reports.shutdown?.stopOrder).toEqual(['module-a']);
  });
});
