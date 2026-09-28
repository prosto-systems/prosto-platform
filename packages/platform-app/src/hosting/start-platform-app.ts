import type { FastifyHttpAdapter } from '@prosto/platform-adapter-fastify';
import type {
  IPlatformAppHandle,
  PlatformAppOptionsType,
} from '../interfaces/index.js';
import {
  type IPlatformRuntime,
  RuntimeBuilder,
  RuntimeStartupStatus,
} from '@prosto/platform-core';
import {
  HOST_RESTART_CAPABILITY_SERVICE_TOKEN,
  type IHostRestartCapability,
} from '@prosto/platform-sdk/platform';
import {
  RESPONSE_FLUSH_DELAY_MS,
  RESTART_EXIT_CODE,
} from '../constants/index.js';
import {
  type IHostSlot,
  requireAbsolutePath,
  reserveHost,
  resolveAdapters,
} from '../utils/index.js';

class PlatformAppHost implements IPlatformAppHandle {
  private _shutdownPromise: Promise<void> | undefined;
  private _restartRequested = false;

  readonly restart: IHostRestartCapability = {
    requestGracefulShutdown: () => {
      this._restartRequested = true;
      this._shutdownPromise ??= new Promise<void>((resolve) => {
        setTimeout(resolve, RESPONSE_FLUSH_DELAY_MS);
      }).then(() => this._runShutdown());

      return this._shutdownPromise;
    },
  };

  constructor(
    readonly runtime: IPlatformRuntime,
    private readonly _slot: IHostSlot,
    private readonly _http?: FastifyHttpAdapter,
  ) {}

  get url(): URL | undefined {
    return this._http?.url;
  }

  attachSignals(): void {
    process.on('SIGINT', this._onSignal);
    process.on('SIGTERM', this._onSignal);
  }

  stop(): Promise<void> {
    this._shutdownPromise ??= this._runShutdown();
    return this._shutdownPromise;
  }

  private readonly _onSignal = (): void => {
    this.stop().catch(() => {
      // runShutdown already records a safe failure and sets the exit code.
    });
  };

  private async _runShutdown(): Promise<void> {
    try {
      await this.runtime.stop();

      const issueCount = this.runtime.reports.shutdown?.issues.length ?? 0;

      if (issueCount > 0) {
        throw new Error('Platform application shutdown reported issues.');
      }
    } catch {
      console.error('Platform application failed to stop.');
      process.exitCode = this._restartRequested ? RESTART_EXIT_CODE : 1;
      throw new Error('Platform application failed to stop.');
    } finally {
      process.off('SIGINT', this._onSignal);
      process.off('SIGTERM', this._onSignal);

      this._slot.active = false;
    }

    process.exitCode = this._restartRequested ? RESTART_EXIT_CODE : 0;
  }
}

/**
 * @alpha
 * Start exactly one application host per process with either the built-in
 * Fastify/TypeORM preset or a complete set of SDK runtime adapters.
 */
export async function startPlatformApp(
  options: PlatformAppOptionsType,
): Promise<IPlatformAppHandle> {
  const slot = reserveHost();
  let runtime: IPlatformRuntime | undefined;
  let started = false;

  try {
    requireAbsolutePath(options.configDir, 'configDir');

    const { adapters, http } = resolveAdapters(options);
    let host: PlatformAppHost | undefined; // eslint-disable-line prefer-const

    runtime = new RuntimeBuilder().build({
      configDir: options.configDir,
      environment: options.environment,
      commandLineArgs: options.commandLineArgs,
      correlationId: options.correlationId,
      platformPersistenceDescriptor: options.platformPersistenceDescriptor,
      adapters,
      configureServices: (services) => {
        services.register(HOST_RESTART_CAPABILITY_SERVICE_TOKEN, {
          requestGracefulShutdown: () => {
            if (!host) {
              throw new Error('Platform application host is not available.');
            }
            return host.restart.requestGracefulShutdown();
          },
        });
        options.configureServices?.(services);
      },
    });
    host = new PlatformAppHost(runtime, slot, http);

    await runtime.start();
    const report = runtime.reports.startup;

    if (
      !runtime.started ||
      !report ||
      report.status === RuntimeStartupStatus.Failed
    ) {
      console.error('Platform application startup failed.', {
        status: report?.status ?? 'missing',
      });
      throw new Error('Platform application startup failed.');
    }

    if (report.degraded) {
      console.warn('Platform application started in a degraded state.', {
        status: report.status,
        failedCount: report.failedModules.length,
      });
    }

    host.attachSignals();
    started = true;

    return host;
  } catch (error) {
    if (runtime && !runtime.stopped) {
      try {
        await runtime.stop();
      } catch {
        console.error('Platform application startup cleanup failed.');
      }
    }

    throw error;
  } finally {
    if (!started) slot.active = false;
  }
}
