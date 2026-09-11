import { describe, expect, it } from 'vitest';
import {
  platformConfigSchema,
  platformLocalAdapterConfigSchema,
} from '@/runtime/schemas/index.js';

describe('platformConfigSchema adapter configuration', () => {
  it('preserves TypeORM configuration as opaque adapter-scoped data', () => {
    // Arrange
    const configuration = {
      adapters: {
        typeorm: {
          enabled: true,
          type: 'sqlite',
          database: ':memory:',
          unsupportedAdapterOption: true,
        },
      },
    };

    // Act
    const result = platformConfigSchema.safeParse(configuration);

    // Assert
    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('Expected adapter configuration to be accepted by core.');
    }

    expect(result.data.adapters.typeorm).toEqual(
      configuration.adapters.typeorm,
    );
  });

  it('removes the legacy persistence configuration path', () => {
    // Arrange
    const configuration = {
      persistence: {
        typeorm: {
          enabled: true,
          type: 'sqlite',
          url: 'file:///tmp/platform.sqlite',
        },
      },
    };

    // Act
    const result = platformConfigSchema.safeParse(configuration);

    // Assert
    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('Expected the legacy configuration to be ignored.');
    }

    expect(result.data).not.toHaveProperty('persistence');
  });

  it('rejects legacy persistence settings in a local override', () => {
    // Arrange
    const configuration = {
      persistence: {
        typeorm: { password: 'not-a-local-adapter-override' },
      },
    };

    // Act
    const result = platformLocalAdapterConfigSchema.safeParse(configuration);

    // Assert
    expect(result.success).toBe(false);
  });

  it('preserves configuration for a kebab-case module identifier', () => {
    // Arrange
    const configuration = {
      modules: {
        'platform-admin': {
          allowedPublicOrigin: 'https://admin.example.invalid',
        },
      },
    };

    // Act
    const result = platformConfigSchema.parse(configuration);

    // Assert
    expect(result.modules['platform-admin']).toEqual({
      allowedPublicOrigin: 'https://admin.example.invalid',
    });
  });
});
