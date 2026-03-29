import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_PACKAGE_JSON = path.resolve('package.json');
const REQUIRED_WORKSPACE_GLOB = 'packages/*';
const REQUIRED_PACKAGE_DIRS = [
  'platform-sdk',
  'platform-core',
  'platform-contract-tests',
  'platform-cli',
  'platform-adapter-http',
];

const rootManifest = JSON.parse(await readFile(ROOT_PACKAGE_JSON, 'utf8'));
const workspaces = Array.isArray(rootManifest.workspaces) ? rootManifest.workspaces : [];

if (!workspaces.includes(REQUIRED_WORKSPACE_GLOB)) {
  throw new Error(`Expected root workspaces to include "${REQUIRED_WORKSPACE_GLOB}".`);
}

for (const packageDir of REQUIRED_PACKAGE_DIRS) {
  const packageJsonPath = path.resolve('packages', packageDir, 'package.json');
  try {
    await readFile(packageJsonPath, 'utf8');
  } catch {
    throw new Error(`Missing required Phase 02 package manifest: ${packageJsonPath}`);
  }
}

console.log('lint:architecture passed: workspace topology and required package manifests are present.');
