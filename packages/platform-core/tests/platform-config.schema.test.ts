import { describe, expect, it } from 'vitest';
import { platformConfigSchema } from '@/runtime/schemas/index.js';

describe('platformConfigSchema TypeORM persistence', () => {
  it('accepts SQLite database configuration', () => {
    // Arrange
    const configuration = {
      persistence: {
        typeorm: {
          enabled: true,
          type: 'sqlite',
          database: ':memory:',
        },
      },
    };

    // Act
    const result = platformConfigSchema.safeParse(configuration);

    // Assert
    expect(result.success).toBe(true);
  });

  it('rejects SQLite URL configuration', () => {
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
    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected SQLite URL configuration to be rejected.');
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['persistence', 'typeorm', 'url'],
        }),
      ]),
    );
  });

  it('accepts server dialect URL configuration', () => {
    // Arrange
    const configuration = {
      persistence: {
        typeorm: {
          enabled: true,
          type: 'postgres',
          url: 'postgres://user:password@localhost/platform',
        },
      },
    };

    // Act
    const result = platformConfigSchema.safeParse(configuration);

    // Assert
    expect(result.success).toBe(true);
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
