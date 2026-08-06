import { readFile, readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const SOURCE_DIRECTORY = new URL('../src/', import.meta.url);

describe('auth session module architecture boundary', (): void => {
  it('does not expose TypeORM or adapter types from its public entry point', async (): Promise<void> => {
    const source = await readFile(
      new URL('../src/index.ts', import.meta.url),
      'utf8',
    );
    expect(source).not.toContain('typeorm');
    expect(source).not.toContain('platform-adapter');
  });

  it('contains no imports from platform core or other feature modules', async (): Promise<void> => {
    const files = (await readdir(SOURCE_DIRECTORY, { recursive: true })).filter(
      (file) => file.endsWith('.ts'),
    );
    const sources = await Promise.all(
      files.map((file) => readFile(new URL(file, SOURCE_DIRECTORY), 'utf8')),
    );
    for (const source of sources) {
      expect(source).not.toContain('@prosto/platform-core');
      expect(source).not.toContain('@prosto/platform-module-');
    }
  });
});
