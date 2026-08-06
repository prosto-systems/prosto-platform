import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const SOURCE_DIRECTORY = new URL('../src/', import.meta.url);
const FORBIDDEN_PLATFORM_IMPORTS = [
  '@prosto/platform-core',
  '@prosto/platform-adapter-',
  '@prosto/platform-module-',
  '@prosto/platform-admin-',
] as const;
const FORBIDDEN_RUNTIME_IMPORTS = [
  'fastify',
  'jose',
  'openid-client',
  'typeorm',
] as const;

describe('AES key-ring adapter architecture boundary', (): void => {
  it('imports only the SDK and node crypto across every source file', async (): Promise<void> => {
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
