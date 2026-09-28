import { fileURLToPath } from 'node:url';
import { startPlatformApp } from '@prosto/platform-app';

async function main(): Promise<void> {
  const app = await startPlatformApp({
    configDir: fileURLToPath(new URL('../config', import.meta.url)),
    host: '127.0.0.1',
    port: 3001,
    localhostCertificatePath: fileURLToPath(
      new URL('../certificates/localhost-cert.pem', import.meta.url),
    ),
    localhostPrivateKeyPath: fileURLToPath(
      new URL('../certificates/localhost-key.pem', import.meta.url),
    ),
  });

  console.info(`HTTP adapter is listening at ${app.url?.href}`);
}

main().catch(() => {
  console.error('The production admin example failed to start.');
  process.exitCode = 1;
});
