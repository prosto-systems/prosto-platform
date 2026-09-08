import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AdminAssetCatalog,
  AdminAssetExportsParser,
  PlatformRuntimeCatalog,
  getAdminModuleAssets,
  setAdminModuleAssets,
} from '@/administration/index.js';
import { PlatformModuleEnvelope } from '@/modularity/index.js';

const temporaryDirectories: string[] = [];

describe('AdminAssetExportsParser', () => {
  it('parses explicit exports and hashes only declared admin build files', async () => {
    // Arrange
    const packageRoot = await createAdminPackage({
      './admin': './dist/admin/admin.plugin.js',
      './admin/assets/chunk': './dist/admin/chunk.mjs',
      './admin/styles/main': './dist/admin/admin.plugin.css',
      './platform': './dist/platform/platform.module.js',
    });
    await writeFile(join(packageRoot, 'dist/admin/stale.js'), 'stale');
    const parser = new AdminAssetExportsParser();

    // Act
    const assets = await parser.parse(packageRoot, 'module-test', '1.0.0');

    // Assert
    expect(assets?.plugin).toMatchObject({
      moduleId: 'module-test',
      moduleVersion: '1.0.0',
      entry: {
        path: '/modules/module-test/dist/admin/admin.plugin.js',
        type: 'script',
      },
      contentFiles: [
        {
          path: '/modules/module-test/dist/admin/admin.plugin.css',
          type: 'style',
        },
      ],
    });
    expect(assets?.assets.map((asset) => asset.pathname)).toEqual([
      '/modules/module-test/dist/admin/admin.plugin.js',
      '/modules/module-test/dist/admin/chunk.mjs',
      '/modules/module-test/dist/admin/admin.plugin.css',
    ]);
    expect(assets?.assets.every((asset) => asset.version.length === 64)).toBe(
      true,
    );
  });

  it('rejects conditional, wildcard, duplicate, and unsupported admin exports', async () => {
    // Arrange
    const cases: readonly [string, Record<string, unknown>][] = [
      [
        'conditional entry',
        { './admin': { import: './dist/admin/admin.plugin.js' } },
      ],
      [
        'wildcard support key',
        {
          './admin': './dist/admin/admin.plugin.js',
          './admin/assets/*': './dist/admin/*.js',
        },
      ],
      [
        'duplicate target',
        {
          './admin': './dist/admin/admin.plugin.js',
          './admin/assets/alias': './dist/admin/admin.plugin.js',
        },
      ],
      [
        'unsupported support file',
        {
          './admin': './dist/admin/admin.plugin.js',
          './admin/assets/source-map': './dist/admin/admin.plugin.js.map',
        },
      ],
    ];
    const parser = new AdminAssetExportsParser();

    // Act and Assert
    for (const [, exportsValue] of cases) {
      const packageRoot = await createAdminPackage(exportsValue);

      await expect(
        parser.parse(packageRoot, 'module-test', '1.0.0'),
      ).rejects.toThrow();
    }
  });

  it('rejects an asset symlink even when its target is inside the admin build', async (context) => {
    // Arrange
    const packageRoot = await createAdminPackage({
      './admin': './dist/admin/admin.plugin.js',
    });
    const entryPath = join(packageRoot, 'dist/admin/admin.plugin.js');
    const linkPath = join(packageRoot, 'dist/admin/link.mjs');
    try {
      await symlink(entryPath, linkPath, 'file');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EPERM') {
        context.skip();
        return;
      }

      throw error;
    }
    await writeFile(
      join(packageRoot, 'package.json'),
      JSON.stringify({
        exports: { './admin': './dist/admin/link.mjs' },
      }),
    );
    const parser = new AdminAssetExportsParser();

    // Act
    const parse = parser.parse(packageRoot, 'module-test', '1.0.0');

    // Assert
    await expect(parse).rejects.toThrow('must not traverse symlinks');
  });
});

describe('Administration catalogs', () => {
  it('publishes only started plugin assets and opens each resolved stream once', async () => {
    // Arrange
    const packageRoot = await createAdminPackage({
      './admin': './dist/admin/admin.plugin.js',
    });
    const assets = await new AdminAssetExportsParser().parse(
      packageRoot,
      'module-test',
      '1.0.0',
    );
    expect(assets).toBeDefined();
    const catalog = new AdminAssetCatalog();
    catalog.replace(assets?.assets ?? []);
    const entry = assets?.assets[0];
    expect(entry).toBeDefined();

    // Act
    const reader = catalog.resolveAsset({
      pathname: entry?.pathname ?? '',
      version: entry?.version ?? '',
    });

    // Assert
    expect(
      catalog.resolveAsset({
        pathname: '/modules/module-test/dist/admin/stale.js',
        version: entry?.version ?? '',
      }),
    ).toBeUndefined();
    expect(
      catalog.resolveAsset({
        pathname: entry?.pathname ?? '',
        version: 'obsolete',
      }),
    ).toBeUndefined();
    expect(reader).toBeDefined();

    const result = await reader?.open();
    const response = new Response(result?.stream);
    await expect(response.text()).resolves.toBe('export {};');
    await expect(reader?.open()).rejects.toThrow('only be opened once');
  });

  it('retains a sanitized degraded snapshot but descriptors only for started modules', () => {
    // Arrange
    const startedModule = createModuleEnvelope('module-started', 'Started');
    const failedModule = createModuleEnvelope('module-failed', 'Failed');
    setAdminModuleAssets(startedModule, {
      assets: [],
      plugin: {
        contentFiles: [],
        entry: {
          hash: 'hash',
          path: '/modules/module-started/dist/admin/admin.plugin.js',
          type: 'script',
        },
        moduleId: 'module-started',
        moduleVersion: '1.0.0',
        runtimeApiVersion: 1,
      },
    });
    const catalog = new PlatformRuntimeCatalog('Prosto', '1.0.0');

    // Act
    catalog.replace([startedModule, failedModule], [startedModule]);

    // Assert
    expect(catalog.getSnapshot()).toEqual({
      name: 'Prosto',
      version: '1.0.0',
      modules: [
        {
          id: 'module-started',
          status: 'healthy',
          title: 'Started',
          version: '1.0.0',
        },
        {
          id: 'module-failed',
          status: 'degraded',
          title: 'Failed',
          version: '1.0.0',
        },
      ],
    });
    expect(catalog.getAdminPluginDescriptors()).toEqual([
      { plugin: getAdminModuleAssets(startedModule)?.plugin },
    ]);
  });
});

async function createAdminPackage(
  exportsValue: Record<string, unknown>,
): Promise<string> {
  const packageRoot = await createTemporaryDirectory();
  await mkdir(join(packageRoot, 'dist/admin'), { recursive: true });
  await mkdir(join(packageRoot, 'dist/platform'), { recursive: true });
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({ exports: exportsValue }),
  );
  await writeFile(
    join(packageRoot, 'dist/admin/admin.plugin.js'),
    'export {};',
  );
  await writeFile(join(packageRoot, 'dist/admin/admin.plugin.css'), 'body {}');
  await writeFile(join(packageRoot, 'dist/admin/chunk.mjs'), 'export {};');
  await writeFile(
    join(packageRoot, 'dist/platform/platform.module.js'),
    'export {};',
  );

  return packageRoot;
}

function createModuleEnvelope(
  id: string,
  title: string,
): PlatformModuleEnvelope {
  return new PlatformModuleEnvelope({
    dependencies: [],
    id,
    sdkVersion: '^0.0.0',
    title,
    version: '1.0.0',
  });
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = join(
    tmpdir(),
    `prosto-platform-admin-catalog-${Date.now().toString()}-${Math.random().toString(16).slice(2)}`,
  );
  await mkdir(directory);
  temporaryDirectories.push(directory);

  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});
