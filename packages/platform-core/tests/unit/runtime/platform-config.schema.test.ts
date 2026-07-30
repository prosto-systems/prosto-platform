import { describe, expect, it } from 'vitest';
import { type IPlatformConfig, platformConfigSchema } from '@/runtime/index.js';

describe('platformConfigSchema', () => {
  it('validates a complete platform config', () => {
    const config: IPlatformConfig = {
      platform: {
        name: 'prosto-platform',
        version: '1.0.0',
        basePath: process.cwd(),
        startupPolicy: 'strict',
      },
      runtime: {
        shutdownTimeoutMs: 60000,
        correlationId: 'test-correlation-id',
      },
      modules: {
        configAccessPolicy: {
          productionStrictMode: true,
        },
        artifactCache: {
          enabled: true,
          path: './custom-cache',
        },
      },
      security: {
        secretRedaction: {
          enabled: true,
          patterns: ['password', 'token'],
        },
      },
      logging: {
        level: 'error',
        format: 'json',
      },
      custom: {
        featureFlags: { newUI: true },
      },
    };

    const result = platformConfigSchema.parse(config);

    expect(result.platform.name).toBe('prosto-platform');
    expect(result.runtime.shutdownTimeoutMs).toBe(60000);
    expect(result.modules.artifactCache.enabled).toBe(true);
    expect(result.security.secretRedaction.enabled).toBe(true);
    expect(result.logging.level).toBe('error');
    expect(result.custom.featureFlags).toEqual({ newUI: true });
  });

  it('applies default values for missing nested fields', () => {
    const result = platformConfigSchema.parse({
      platform: {
        name: 'prosto-platform',
        version: '1.0.0',
        basePath: process.cwd(),
      },
      runtime: {},
      modules: { artifactCache: {} },
      security: { secretRedaction: {} },
      logging: {},
    } as IPlatformConfig);

    expect(result.runtime.shutdownTimeoutMs).toBe(30000);
    expect(result.platform.startupPolicy).toBe('strict');
    expect(result.modules.artifactCache.enabled).toBe(false);
    expect(result.security.secretRedaction.enabled).toBe(true);
    expect(result.logging.level).toBe('info');
    expect(result.custom).toEqual({});
  });

  it('rejects negative shutdownTimeoutMs', () => {
    expect(() =>
      platformConfigSchema.parse({
        platform: {
          name: 'prosto-platform',
          version: '1.0.0',
          basePath: process.cwd(),
        },
        runtime: { shutdownTimeoutMs: -100 },
      } as IPlatformConfig),
    ).toThrow();
  });

  it('rejects zero shutdownTimeoutMs', () => {
    expect(() =>
      platformConfigSchema.parse({
        platform: {
          name: 'prosto-platform',
          version: '1.0.0',
          basePath: process.cwd(),
        },
        runtime: { shutdownTimeoutMs: 0 },
      } as IPlatformConfig),
    ).toThrow();
  });

  it('accepts partial override of nested fields', () => {
    const result = platformConfigSchema.parse({
      platform: {
        name: 'prosto-platform',
        version: '1.0.0',
        basePath: process.cwd(),
      },
      logging: { level: 'debug' },
    } as IPlatformConfig);

    expect(result.logging.level).toBe('debug');
    expect(result.logging.format).toBe('text');
  });

  it('allows custom fields of any type', () => {
    const result = platformConfigSchema.parse({
      platform: {
        name: 'prosto-platform',
        version: '1.0.0',
        basePath: process.cwd(),
      },
      runtime: {},
      modules: { artifactCache: {} },
      security: { secretRedaction: {} },
      logging: {},
      custom: {
        string: 'value',
        number: 42,
        boolean: true,
        nested: { key: 'value' },
        array: [1, 2, 3],
      },
    });

    expect(result.custom.string).toBe('value');
    expect(result.custom.number).toBe(42);
    expect(result.custom.nested).toEqual({ key: 'value' });
    expect(result.custom.array).toEqual([1, 2, 3]);
  });
});
