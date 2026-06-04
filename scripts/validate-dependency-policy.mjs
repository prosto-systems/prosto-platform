import { readFile } from 'node:fs/promises';
import path from 'node:path';

const WORKSPACE_PACKAGE_DIRS = [
  'platform-sdk',
  'platform-admin-contracts',
  'platform-core',
  'platform-contract-tests',
  'platform-cli',
  'platform-adapter-http',
];

const INTERNAL_PREFIX = '@prosto/';

const allowedInternalDeps = new Map([
  ['@prosto/platform-sdk', []],
  ['@prosto/platform-admin-contracts', []],
  ['@prosto/platform-core', ['@prosto/platform-sdk']],
  ['@prosto/platform-contract-tests', ['@prosto/platform-sdk']],
  ['@prosto/platform-cli', ['@prosto/platform-sdk']],
  ['@prosto/platform-adapter-http', ['@prosto/platform-sdk']],
]);

for (const packageDir of WORKSPACE_PACKAGE_DIRS) {
  const packageJsonPath = path.resolve('packages', packageDir, 'package.json');
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const packageName = String(manifest.name ?? '');
  const dependencies = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
    ...(manifest.optionalDependencies ?? {}),
  };

  const allowed = new Set(allowedInternalDeps.get(packageName) ?? []);

  for (const depName of Object.keys(dependencies)) {
    if (!depName.startsWith(INTERNAL_PREFIX)) {
      continue;
    }

    if (!allowed.has(depName)) {
      throw new Error(
        `Dependency policy violation: ${packageName} cannot depend on ${depName}.`,
      );
    }
  }
}

const rootManifest = JSON.parse(
  await readFile(path.resolve('package.json'), 'utf8'),
);
const rootDeps = Object.keys(rootManifest.dependencies ?? {});
const forbiddenRootDeps = ['cookie-parser', 'cors', 'helmet', 'node-fetch'];

for (const forbidden of forbiddenRootDeps) {
  if (rootDeps.includes(forbidden)) {
    throw new Error(
      `Root dependency policy violation: ${forbidden} must be owned by adapter packages.`,
    );
  }
}

console.log(
  'validate:dependency-policy passed: internal dependency rules and adapter dependency ownership are valid.',
);
