import type { IPlatformConfig } from '@/runtime/index.js';
import { RuntimeErrorCodes } from '@/common/index.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateOperationalReportsSchema } from '@/diagnostics/index.js';
import {
  createManifest,
  createRuntime,
  TestModule,
} from '@/tests/fixtures/index.js';

describe('runtime policy diagnostics validation', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prosto-config-test-'));
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('produces startup diagnostics payload with required fields', async () => {
    const baseConfig = {
      platform: { startupPolicy: 'strict' },
      modules: { artifactCache: { enabled: false } },
    } as IPlatformConfig;

    writeFileSync(
      join(tempDir, 'app_settings.json'),
      JSON.stringify(baseConfig),
    );

    const moduleA = new TestModule(createManifest({ id: 'module-a' }));

    const runtime = await createRuntime({
      modules: [{ module: moduleA, type: 'memory' }],
      correlationId: 'rt-validation-test',
      configDir: tempDir,
    });

    expect(() =>
      validateOperationalReportsSchema(runtime.reports),
    ).not.toThrow();
    expect(runtime.reports.startup?.correlationId).toBe('rt-validation-test');
    expect(runtime.reports.startup?.policyMode).toBe('strict');

    await runtime.stop();
  });
});

describe('config access policy validation', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prosto-config-access-test-'));
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('wildcard capability detection', () => {
    it('detects and denies wildcard capabilities in strict mode', async () => {
      const baseConfig = {
        platform: { startupPolicy: 'strict' },
        modules: { artifactCache: { enabled: false } },
      } as IPlatformConfig;

      writeFileSync(
        join(tempDir, 'app_settings.json'),
        JSON.stringify(baseConfig),
      );

      // Module with wildcard capability that should be denied
      const moduleWithWildcard = new TestModule(
        createManifest({
          id: 'module-wildcard-test',
          capabilities: ['config.read.*'], // Wildcard pattern
        }),
      );

      const runtime = await createRuntime({
        modules: [{ module: moduleWithWildcard, type: 'memory' }],
        correlationId: 'wildcard-test',
        configDir: tempDir,
      });

      // Verify that diagnostics are produced with proper structure
      expect(() =>
        validateOperationalReportsSchema(runtime.reports),
      ).not.toThrow();

      // Verify that wildcard capability triggers specific error code
      const hasWildcardError =
        runtime.reports.startup?.failedModules.some((f) =>
          f.message.includes('wildcard_config_capability_forbidden'),
        ) ||
        runtime.reports.startup?.skippedModules.some((s) =>
          s.reason.message.includes('wildcard_config_capability_forbidden'),
        );

      expect(hasWildcardError).toBe(true);

      await runtime.stop();
    });
  });

  describe('security class and section allowlist consistency', () => {
    it('validates that third-party-reviewed modules have restricted access', async () => {
      const baseConfig = {
        platform: { startupPolicy: 'strict' },
        modules: { artifactCache: { enabled: false } },
      } as IPlatformConfig;

      writeFileSync(
        join(tempDir, 'app_settings.json'),
        JSON.stringify(baseConfig),
      );

      // Third-party reviewed module with global config access capability
      const thirdPartyModule = new TestModule(
        createManifest({
          id: 'module-thirdparty',
          securityClass: 'third-party-reviewed',
          capabilities: ['config.read.modules'],
        }),
      );

      const runtime = await createRuntime({
        modules: [{ module: thirdPartyModule, type: 'memory' }],
        correlationId: 'thirdparty-test',
        configDir: tempDir,
      });

      // Third-party modules should not have unrestricted global access
      // Either they should be skipped or fail with CONFIG_SECTION_NOT_ALLOWLISTED
      const hasRestriction =
        runtime.reports.startup?.failedModules.some(
          (failed) =>
            failed.errorCode === RuntimeErrorCodes.ConfigSectionNotAllowlisted,
        ) ||
        runtime.reports.startup?.skippedModules.some(
          (skipped) =>
            skipped.reason.errorCode ===
            RuntimeErrorCodes.ConfigSectionNotAllowlisted,
        );

      expect(hasRestriction).toBe(true);

      await runtime.stop();
    });

    it('allows trusted modules broader access than third-party modules', async () => {
      const baseConfig = {
        platform: { startupPolicy: 'strict' },
        modules: { artifactCache: { enabled: false } },
      } as IPlatformConfig;

      writeFileSync(
        join(tempDir, 'app_settings.json'),
        JSON.stringify(baseConfig),
      );

      // Trusted module with global config access capability
      const trustedModule = new TestModule(
        createManifest({
          id: 'module-trusted',
          securityClass: 'trusted',
          capabilities: ['config.read.modules'],
        }),
      );

      const runtime = await createRuntime({
        modules: [{ module: trustedModule, type: 'memory' }],
        correlationId: 'trusted-test',
        configDir: tempDir,
      });

      // Verify diagnostics schema passes
      expect(() =>
        validateOperationalReportsSchema(runtime.reports),
      ).not.toThrow();

      expect(runtime.reports.startup?.failedModules.length === 0).toBe(true);
      expect(runtime.reports.startup?.skippedModules.length === 0).toBe(true);

      await runtime.stop();
    });
  });
});
