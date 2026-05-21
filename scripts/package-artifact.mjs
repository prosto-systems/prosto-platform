import AdmZip from 'adm-zip';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const moduleRoot = process.cwd();
const packageJsonPath = join(moduleRoot, 'package.json');
const artifactsDir = join(moduleRoot, 'artifacts');
const distDir = join(moduleRoot, 'dist');

const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const moduleId = pkg.name.replace(/^@[^/]+\//, '');
const version = pkg.version;
const zipFileName = `${moduleId}-${version}.zip`;
const zipFilePath = join(artifactsDir, zipFileName);

const zip = new AdmZip();

zip.addLocalFolder(distDir, 'dist');
zip.addLocalFile(packageJsonPath, '');

zip.writeZip(zipFilePath);

const zipBuffer = readFileSync(zipFilePath);
const checksum = createHash('sha256').update(zipBuffer).digest('hex');
const checksumFormatted = `sha256:${checksum}`;

writeFileSync(`${zipFilePath}.sha256`, checksumFormatted);

console.log(`Artifact created: ${zipFileName}`);
console.log(`Checksum: ${checksumFormatted}`);
console.log(`Checksum file: ${zipFileName}.sha256`);
