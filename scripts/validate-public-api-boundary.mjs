import { readFile } from 'node:fs/promises';
import path from 'node:path';

const PACKAGE_DIRS = [
  'platform-sdk',
  'platform-core',
  'platform-contract-tests',
  'platform-cli',
  'platform-adapter-http',
];

for (const packageDir of PACKAGE_DIRS) {
  const packageJsonPath = path.resolve('packages', packageDir, 'package.json');
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const packageName = String(manifest.name ?? '');
  const rootExport = manifest.exports?.['.'];

  if (!rootExport || typeof rootExport !== 'object') {
    throw new Error(
      `Public API boundary violation: ${packageName} must export only the package root entry point.`,
    );
  }

  const exportKeys = Object.keys(manifest.exports);

  if (exportKeys.length !== 1 || exportKeys[0] !== '.') {
    throw new Error(
      `Public API boundary violation: ${packageName} exports must be restricted to "." during Phase 02.`,
    );
  }

  if (manifest.types !== './dist/index.d.ts') {
    throw new Error(
      `Public API boundary violation: ${packageName} must set types to ./dist/index.d.ts.`,
    );
  }

  if (manifest.main !== './dist/index.js') {
    throw new Error(
      `Public API boundary violation: ${packageName} must set main to ./dist/index.js.`,
    );
  }
}

console.log(
  'validate:public-api-boundary passed: package exports are constrained to root public entry points.',
);
