import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';
import manifest from '../manifest.json' with { type: 'json' };

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDirectory = resolve(packageRoot, 'artifacts');
const artifactName = `${manifest.id}-${manifest.version}.zip`;
const artifactPath = resolve(artifactsDirectory, artifactName);

await mkdir(artifactsDirectory, { recursive: true });

const output = createWriteStream(artifactPath);
const archive = new ZipArchive({ zlib: { level: 9 } });
const archiveFinished = finished(output);

archive.on('error', (error) => output.destroy(error));
archive.pipe(output);
archive.directory(resolve(packageRoot, 'dist'), 'dist');
archive.file(resolve(packageRoot, 'manifest.json'), { name: 'manifest.json' });
archive.file(resolve(packageRoot, 'package.json'), { name: 'package.json' });

await archive.finalize();
await archiveFinished;
