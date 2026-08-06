import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const SOURCE_DIRECTORY = new URL('../src/', import.meta.url);
const FORBIDDEN_PLATFORM_IMPORTS = [
  '@prosto/platform-core',
  "@prosto/platform-adapter-auth'",
  '@prosto/platform-adapter-aes-key-ring',
  '@prosto/platform-adapter-http',
  '@prosto/platform-adapter-typeorm',
  '@prosto/platform-module-',
  '@prosto/platform-admin-',
] as const;
const FORBIDDEN_RUNTIME_IMPORTS = ['fastify', 'typeorm'] as const;

describe('session adapter architecture boundary', (): void => {
  it('imports only SDK and openid-client platform dependencies', async (): Promise<void> => {
    // Arrange
    const sourceFiles = (
      await readdir(SOURCE_DIRECTORY, { recursive: true })
    ).filter((entry) => entry.endsWith('.ts'));

    // Act
    const sources = await Promise.all(
      sourceFiles.map((file) =>
        readFile(new URL(file, SOURCE_DIRECTORY), 'utf-8'),
      ),
    );

    // Assert
    for (const source of sources) {
      for (const forbiddenImport of FORBIDDEN_PLATFORM_IMPORTS) {
        expect(source).not.toContain(forbiddenImport);
      }
      for (const forbiddenImport of FORBIDDEN_RUNTIME_IMPORTS) {
        expect(source).not.toContain(forbiddenImport);
      }
    }
  });
});
