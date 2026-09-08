import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import selfsigned from 'selfsigned';

const exampleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const certificateDirectory = resolve(exampleRoot, 'certificates');
const certificatePath = resolve(certificateDirectory, 'localhost-cert.pem');
const privateKeyPath = resolve(certificateDirectory, 'localhost-key.pem');

try {
  await Promise.all([access(certificatePath), access(privateKeyPath)]);
} catch {
  await mkdir(certificateDirectory, { recursive: true });
  const certificate = await selfsigned.generate(
    [{ name: 'commonName', value: 'localhost' }],
    {
      algorithm: 'sha256',
      days: 30,
      extensions: [
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            { ip: '127.0.0.1', type: 7 },
            { ip: '::1', type: 7 },
          ],
        },
      ],
      keySize: 2048,
    },
  );

  await Promise.all([
    writeFile(certificatePath, certificate.cert),
    writeFile(privateKeyPath, certificate.private, { mode: 0o600 }),
  ]);
}
