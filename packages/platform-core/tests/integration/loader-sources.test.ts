import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { RuntimeReasonCodes } from '../../src/compatibility/reason-codes.js';
import { createPlatformRuntime } from '../../src/runtime/create-runtime.js';
import { createManifest, TestModule } from './runtime-fixtures.js';

describe('runtime loader sources', () => {
  it('keeps backward compatibility for memory module refs', async () => {
    const moduleA = new TestModule(createManifest({ id: 'module-a' }));

    const runtime = await createPlatformRuntime({
      startupPolicy: 'strict',
      runtimeVersion: {
        sdkVersion: '0.0.0',
        nodeVersion: process.versions.node,
      },
      modules: [{ module: moduleA }],
    });

    expect(runtime.startedModuleIds).toEqual(['module-a']);
    expect(runtime.reports.startup.status).toBe('success');
  });

  it('marks invalid url source as discover rejection and continues with memory module', async () => {
    const moduleA = new TestModule(createManifest({ id: 'module-a' }));

    const runtime = await createPlatformRuntime({
      startupPolicy: 'strict',
      runtimeVersion: {
        sdkVersion: '0.0.0',
        nodeVersion: process.versions.node,
      },
      modules: [
        { module: moduleA },
        {
          moduleIdHint: 'module-url',
          source: {
            type: 'url',
            url: 'http://insecure.example/module.zip',
            packaging: 'zip',
          },
        },
      ],
    });

    expect(runtime.startedModuleIds).toEqual(['module-a']);
    expect(runtime.reports.startup.status).toBe('degraded');
    expect(runtime.reports.startup.failedModules.some((item) => item.errorCode === RuntimeReasonCodes.SourceUrlInvalid)).toBe(true);
    expect(runtime.reports.startup.skippedModules.some((item) => item.moduleId === 'module-url')).toBe(true);
  });

  it('validates path checksum and rejects on integrity mismatch', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'prosto-loader-'));
    const artifactPath = join(tempDir, 'module.zip');

    try {
      await writeFile(artifactPath, 'artifact payload', 'utf8');

      const runtime = await createPlatformRuntime({
        startupPolicy: 'strict',
        runtimeVersion: {
          sdkVersion: '0.0.0',
          nodeVersion: process.versions.node,
        },
        modules: [
          {
            moduleIdHint: 'module-path',
            source: {
              type: 'path',
              path: artifactPath,
              packaging: 'zip',
              integrity: {
                checksum: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
              },
            },
          },
        ],
      });

      expect(runtime.startedModuleIds).toEqual([]);
      expect(runtime.reports.startup.failedModules.some((item) => item.errorCode === RuntimeReasonCodes.SourceIntegrityMismatch)).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('passes path checksum preflight and reports entry resolve as not implemented', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'prosto-loader-'));
    const artifactPath = join(tempDir, 'module.zip');

    try {
      await writeFile(artifactPath, 'artifact payload', 'utf8');
      const checksum = createHash('sha256').update('artifact payload').digest('hex');

      const runtime = await createPlatformRuntime({
        startupPolicy: 'strict',
        runtimeVersion: {
          sdkVersion: '0.0.0',
          nodeVersion: process.versions.node,
        },
        modules: [
          {
            moduleIdHint: 'module-path-ok',
            source: {
              type: 'path',
              path: artifactPath,
              packaging: 'zip',
              integrity: {
                checksum: `sha256:${checksum}`,
              },
            },
          },
        ],
      });

      expect(runtime.startedModuleIds).toEqual([]);
      expect(runtime.reports.startup.failedModules.some((item) => item.errorCode === RuntimeReasonCodes.SourceEntryResolveFailed)).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
