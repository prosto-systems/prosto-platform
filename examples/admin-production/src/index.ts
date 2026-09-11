import 'reflect-metadata';
import { fileURLToPath } from 'node:url';
import { PlatformAdminTypeOrmAdapter } from '@prosto/platform-adapter-admin-typeorm';
import { FastifyHttpAdapter } from '@prosto/platform-adapter-fastify';
import { TypeOrmPersistenceAdapter } from '@prosto/platform-adapter-typeorm';
import { type IPlatformRuntime, RuntimeBuilder } from '@prosto/platform-core';
import {
  HOST_RESTART_CAPABILITY_SERVICE_TOKEN,
  type IHostRestartCapability,
} from '@prosto/platform-sdk/platform';

const SUPERVISOR_RESTART_EXIT_CODE = 75;
const RESPONSE_FLUSH_DELAY_MS = 100;

class ProcessExitCodeSetter {
  private _set = false;

  set(exitCode: number): void {
    if (this._set) {
      return;
    }

    this._set = true;
    process.exitCode = exitCode;
  }
}

class LocalRestartRequester implements IHostRestartCapability {
  private _shutdownPromise: Promise<void> | undefined;

  constructor(
    private readonly _getRuntime: () => IPlatformRuntime,
    private readonly _exitCodeSetter: ProcessExitCodeSetter,
  ) {}

  requestGracefulShutdown(): Promise<void> {
    this._shutdownPromise ??= this._shutdownAfterResponseFlush();

    return this._shutdownPromise;
  }

  private async _shutdownAfterResponseFlush(): Promise<void> {
    // The restart endpoint has already returned 202 before the poller invokes this.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, RESPONSE_FLUSH_DELAY_MS);
    });

    try {
      await this._getRuntime().stop();
    } finally {
      this._exitCodeSetter.set(SUPERVISOR_RESTART_EXIT_CODE);
    }
  }
}

function getTrustedIngressAddresses(): readonly string[] {
  const value = process.env.PROSTO_TRUSTED_INGRESS_ADDRESSES;

  if (value === undefined || value.trim() === '') {
    throw new Error(
      'PROSTO_TRUSTED_INGRESS_ADDRESSES must be a JSON array of ingress IP addresses or CIDR ranges.',
    );
  }

  try {
    const addresses: unknown = JSON.parse(value);

    if (
      !Array.isArray(addresses) ||
      addresses.length === 0 ||
      addresses.some((address) => typeof address !== 'string')
    ) {
      throw new Error('invalid trusted ingress addresses');
    }

    return addresses;
  } catch {
    throw new Error(
      'PROSTO_TRUSTED_INGRESS_ADDRESSES must be a non-empty JSON array of ingress IP addresses or CIDR ranges.',
    );
  }
}

function getTlsOptions():
  | { readonly certificatePath: string; readonly privateKeyPath: string }
  | undefined {
  const certificatePath = process.env.PROSTO_TLS_CERTIFICATE_PATH;
  const privateKeyPath = process.env.PROSTO_TLS_PRIVATE_KEY_PATH;

  if (certificatePath !== undefined || privateKeyPath !== undefined) {
    if (certificatePath === undefined || privateKeyPath === undefined) {
      throw new Error(
        'PROSTO_TLS_CERTIFICATE_PATH and PROSTO_TLS_PRIVATE_KEY_PATH must be set together.',
      );
    }

    return { certificatePath, privateKeyPath };
  }

  if (process.env.PROSTO_LOCALHOST !== 'true') {
    return undefined;
  }

  return {
    certificatePath: fileURLToPath(
      new URL('../certificates/localhost-cert.pem', import.meta.url),
    ),
    privateKeyPath: fileURLToPath(
      new URL('../certificates/localhost-key.pem', import.meta.url),
    ),
  };
}

async function main(): Promise<void> {
  const exitCodeSetter = new ProcessExitCodeSetter();
  const http = new FastifyHttpAdapter({
    host: '127.0.0.1',
    port: 3001,
    trustedProxies: getTrustedIngressAddresses(),
    tls: getTlsOptions(),
    staticSite: {
      rootPath: fileURLToPath(
        new URL('../../../packages/platform-admin-shell/dist', import.meta.url),
      ),
    },
  });
  const runtime: IPlatformRuntime = new RuntimeBuilder().build({
    configDir: fileURLToPath(new URL('../config', import.meta.url)),
    configureServices: (services) => {
      services.register(
        HOST_RESTART_CAPABILITY_SERVICE_TOKEN,
        new LocalRestartRequester(() => {
          if (runtime === undefined) {
            throw new Error(
              'Platform runtime is unavailable for graceful restart.',
            );
          }

          return runtime;
        }, exitCodeSetter),
      );
    },
    adapters: {
      http,
      persistence: new TypeOrmPersistenceAdapter(),
      admin: new PlatformAdminTypeOrmAdapter(),
    },
  });

  try {
    await runtime.start();
  } catch (error: unknown) {
    if (runtime?.reports.startup) {
      console.error(
        'The production admin example startup report.',
        runtime.reports.startup,
      );
    }

    throw error;
  }

  if (runtime?.reports.startup?.degraded) {
    console.warn(
      'The production admin example started in a degraded state.',
      runtime.reports.startup,
    );
  }

  console.info(`HTTP adapter is listening at ${http.url?.href}`);

  const shutdown = async (): Promise<void> => {
    await runtime.stop();
    exitCodeSetter.set(0);
  };

  const handleShutdownSignal = (): void => {
    void shutdown().catch((error: unknown) => {
      console.error('The production admin example failed to stop.', error);
      exitCodeSetter.set(1);
    });
  };

  process.once('SIGINT', handleShutdownSignal);
  process.once('SIGTERM', handleShutdownSignal);
}

main().catch((error: unknown) => {
  console.error('The production admin example failed to start.', error);
  process.exitCode = 1;
});
