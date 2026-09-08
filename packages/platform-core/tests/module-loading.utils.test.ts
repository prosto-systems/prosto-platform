import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DynamicModuleLoader } from '@/modularity/loader/utils/module-loading.utils.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('DynamicModuleLoader.resolvePlatformModuleEntryPath', () => {
  it('resolves the import condition from a platform export', async () => {
    // Arrange
    const packageDirectory = await mkdtemp(
      join(tmpdir(), 'prosto-platform-module-'),
    );
    temporaryDirectories.push(packageDirectory);
    const entryPath = join(packageDirectory, 'dist', 'platform.module.js');
    await mkdir(join(packageDirectory, 'dist'), { recursive: true });
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({
        exports: {
          './platform': {
            import: './dist/platform.module.js',
            types: './dist/platform.module.d.ts',
          },
        },
      }),
    );

    // Act
    const resolvedEntryPath =
      await DynamicModuleLoader.resolvePlatformModuleEntryPath(
        packageDirectory,
      );

    // Assert
    expect(resolvedEntryPath).toBe(entryPath);
  });
});
