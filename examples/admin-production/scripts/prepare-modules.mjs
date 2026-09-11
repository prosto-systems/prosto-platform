import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const exampleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(exampleRoot, '..', '..');
const modulesRoot = resolve(exampleRoot, 'modules');
const artifacts = [
  {
    sourcePath: resolve(repositoryRoot, 'examples/module-test'),
    targetName: 'module-test',
  },
];

await rm(modulesRoot, { force: true, recursive: true });
await mkdir(modulesRoot, { recursive: true });

for (const artifact of artifacts) {
  const distPath = resolve(artifact.sourcePath, 'dist');

  try {
    const distStats = await stat(distPath);

    if (!distStats.isDirectory()) {
      throw new Error('not a directory');
    }
  } catch {
    throw new Error(
      `Built module artifact is unavailable: ${artifact.targetName}. Run the dependency build first.`,
    );
  }

  const targetPath = resolve(modulesRoot, artifact.targetName);
  await mkdir(targetPath, { recursive: true });
  await Promise.all([
    cp(
      resolve(artifact.sourcePath, 'manifest.json'),
      resolve(targetPath, 'manifest.json'),
    ),
    cp(
      resolve(artifact.sourcePath, 'package.json'),
      resolve(targetPath, 'package.json'),
    ),
    cp(distPath, resolve(targetPath, 'dist'), { recursive: true }),
  ]);
}
