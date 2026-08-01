import { readFile } from 'node:fs/promises';
import path from 'node:path';

const WORKSPACE_PACKAGE_DIRS = [
  'platform-sdk',
  'platform-core',
  'platform-contract-tests',
  'platform-cli',
  'platform-adapter-http',
  'platform-adapter-typeorm',
  'platform-admin-contracts',
  'platform-adapter-admin-bff',
  'platform-admin-shell',
];

const INTERNAL_PREFIX = '@prosto/';

const allowedInternalDeps = new Map([
  ['@prosto/platform-sdk', []],
  ['@prosto/platform-core', ['@prosto/platform-sdk']],
  ['@prosto/platform-contract-tests', ['@prosto/platform-sdk']],
  ['@prosto/platform-cli', ['@prosto/platform-sdk']],
  ['@prosto/platform-adapter-http', ['@prosto/platform-sdk']],
  ['@prosto/platform-admin-contracts', []],
  ['@prosto/platform-adapter-admin-bff', ['@prosto/platform-admin-contracts']],
  ['@prosto/platform-admin-shell', ['@prosto/platform-admin-contracts']],
]);

// Reserved for the Phase 3 adapter; declaring it here allows the future
// adapter-to-SDK edge while keeping core and SDK free of TypeORM.
allowedInternalDeps.set('@prosto/platform-adapter-typeorm', [
  '@prosto/platform-sdk',
]);

const forbiddenPackageDependencies = new Map([
  ['@prosto/platform-sdk', ['typeorm']],
  ['@prosto/platform-core', ['typeorm', '@prosto/platform-adapter-typeorm']],
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
  const forbidden = new Set(
    forbiddenPackageDependencies.get(packageName) ?? [],
  );

  for (const depName of Object.keys(dependencies)) {
    if (forbidden.has(depName)) {
      throw new Error(
        `Dependency policy violation: ${packageName} cannot depend on ${depName}.`,
      );
    }

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
