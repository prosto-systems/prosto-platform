// SPDX-License-Identifier: MIT
// Architecture gate: workspace topology + static import boundary analysis.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  ALLOWED_INTERNAL_DEPENDENCIES,
  DYNAMIC_IMPORT_ALLOWLIST,
  REQUIRED_PACKAGE_DIRS,
  REQUIRED_WORKSPACE_GLOB,
} from './architecture/dependency-matrix.mjs';
import {
  collectSourceFiles,
  extractStaticImports,
  hasDynamicImportOrRequire,
  mapInternalImport,
  validateImportEdge,
} from './architecture/import-analysis.mjs';

const ROOT_PACKAGE_JSON = path.resolve('package.json');
const PACKAGES_ROOT = path.resolve('packages');

const rootManifest = JSON.parse(await readFile(ROOT_PACKAGE_JSON, 'utf8'));
const workspaces = Array.isArray(rootManifest.workspaces)
  ? rootManifest.workspaces
  : [];

if (!workspaces.includes(REQUIRED_WORKSPACE_GLOB)) {
  throw new Error(
    `Expected root workspaces to include "${REQUIRED_WORKSPACE_GLOB}".`,
  );
}

for (const packageDir of REQUIRED_PACKAGE_DIRS) {
  const packageJsonPath = path.resolve(
    PACKAGES_ROOT,
    packageDir,
    'package.json',
  );

  try {
    await readFile(packageJsonPath, 'utf8');
  } catch {
    throw new Error(
      `Missing required platform package manifest: ${packageJsonPath}`,
    );
  }
}

// Build a set of known workspace package names from package.json manifests.
const knownPackageNames = new Set();
const packageDirToName = new Map();
const packageEntries = await readdir(PACKAGES_ROOT, { withFileTypes: true });

for (const entry of packageEntries) {
  if (!entry.isDirectory()) {
    continue;
  }

  const manifestPath = path.resolve(PACKAGES_ROOT, entry.name, 'package.json');

  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const name = String(manifest.name ?? '');

    if (name.startsWith('@prosto/')) {
      knownPackageNames.add(name);
      packageDirToName.set(entry.name, name);
    }
  } catch {
    // Manifest missing or unreadable: skip non-package directories.
  }
}

const violations = [];

for (const [dirName, packageName] of packageDirToName) {
  if (!packageName.startsWith('@prosto/')) {
    continue;
  }

  const srcDir = path.resolve(PACKAGES_ROOT, dirName, 'src');
  let files;

  try {
    files = await collectSourceFiles(srcDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // No src directory for this package; nothing to analyse.
      continue;
    }

    throw error;
  }

  for (const filePath of files) {
    const sourceCode = await readFile(filePath, 'utf8');
    const specifiers = extractStaticImports(sourceCode);

    if (hasDynamicImportOrRequire(sourceCode)) {
      const relativePath = path
        .relative(PACKAGES_ROOT, filePath)
        .replaceAll('\\', '/');

      if (!DYNAMIC_IMPORT_ALLOWLIST.has(relativePath)) {
        violations.push(
          `Dynamic import()/require() is not allowed in package source (file: ${filePath}).`,
        );
      }
    }

    for (const specifier of specifiers) {
      if (specifier.startsWith('.')) {
        // Relative imports are allowed inside the same package. Cross-package relative imports are forbidden.
        const resolved = path.resolve(path.dirname(filePath), specifier);
        const fromPackageDir = path
          .relative(PACKAGES_ROOT, filePath)
          .split(path.sep)[0];
        const toPackageDir = path
          .relative(PACKAGES_ROOT, resolved)
          .split(path.sep)[0];

        if (
          toPackageDir !== fromPackageDir &&
          !path.relative(PACKAGES_ROOT, resolved).startsWith('..')
        ) {
          violations.push(
            `Cross-package relative import from ${packageName} to ${specifier} is not allowed (file: ${filePath}).`,
          );
        }

        continue;
      }

      const internal = mapInternalImport(specifier, knownPackageNames);

      if (!internal) {
        continue;
      }

      const error = validateImportEdge(
        {
          fromPackage: packageName,
          toPackage: internal.packageName,
          specifier,
          filePath,
          line: 1,
          isDeep: internal.isDeep,
          isRelativeCrossPackage: false,
        },
        ALLOWED_INTERNAL_DEPENDENCIES,
      );

      if (error) {
        violations.push(error);
      }
    }
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`Architecture violation: ${violation}`);
  }
  throw new Error(
    `lint:architecture failed with ${violations.length} boundary violation(s).`,
  );
}

console.log(
  'lint:architecture passed: workspace topology and import boundaries are valid.',
);
