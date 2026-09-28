import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IFastifyHttpAdapterOptions } from '@prosto/platform-adapter-fastify';
import type {
  IRequiredRuntimeAdapters,
  IRuntimeBuilderOptions,
} from '@prosto/platform-core';
import { RuntimeStartupStatus } from '@prosto/platform-core';
import {
  HOST_RESTART_CAPABILITY_SERVICE_TOKEN,
  type IHostRestartCapability,
} from '@prosto/platform-sdk/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPlatformApp, type PlatformAppOptionsType } from '../src/index.js';

const mocks = vi.hoisted(() => ({
  build: vi.fn(),
  fastify: vi.fn(),
  persistence: vi.fn(),
  admin: vi.fn(),
}));

vi.mock('@prosto/platform-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@prosto/platform-core')>()),
  RuntimeBuilder: class {
    build(options: IRuntimeBuilderOptions) {
      return mocks.build(options);
    }
  },
}));

vi.mock('@prosto/platform-adapter-fastify', () => ({
  FastifyHttpAdapter: class {
    readonly url = new URL('https://127.0.0.1:3001/');
    constructor(options: unknown) {
      mocks.fastify(options);
    }
  },
}));

vi.mock('@prosto/platform-adapter-typeorm', () => ({
  TypeOrmPersistenceAdapter: class {
    constructor() {
      mocks.persistence();
    }
  },
}));

vi.mock('@prosto/platform-adapter-admin-typeorm', () => ({
  PlatformAdminTypeOrmAdapter: class {
    constructor() {
      mocks.admin();
    }
  },
}));

const configDir = resolve('test-fixtures/config');
const adapters = {
  admin: { role: 'admin' },
  persistence: { role: 'persistence' },
  http: { role: 'http' },
} as unknown as IRequiredRuntimeAdapters;
const custom = (): PlatformAppOptionsType => ({ configDir, adapters });
const baselineSignals = {
  SIGINT: process.listeners('SIGINT'),
  SIGTERM: process.listeners('SIGTERM'),
};

function deferred() {
  let complete!: () => void;
  const promise = new Promise<void>((done) => {
    complete = done;
  });
  return { promise, resolve: complete };
}

function fakeRuntime() {
  const runtime = {
    started: true,
    stopped: false,
    reports: {
      startup: {
        status: RuntimeStartupStatus.Success,
        degraded: false,
        failedModules: [] as string[],
      },
      shutdown: { issues: [] as string[] },
    },
    start: vi.fn(async (): Promise<void> => undefined),
    stop: vi.fn(async () => {
      runtime.stopped = true;
    }),
  };
  mocks.build.mockReturnValue(runtime);
  return runtime;
}

function builtOptions(): IRuntimeBuilderOptions {
  const options = mocks.build.mock.lastCall?.[0] as
    IRuntimeBuilderOptions | undefined;
  if (!options) throw new Error('Runtime was not built.');
  return options;
}

function signalHandler(signal: 'SIGINT' | 'SIGTERM') {
  const original = baselineSignals[signal];
  const handlers = process
    .listeners(signal)
    .filter((handler) => !original.includes(handler));
  expect(handlers).toHaveLength(1);
  const handler = handlers[0];
  if (!handler) throw new Error(`Missing ${signal} handler.`);
  return handler;
}

function expectNoListeners() {
  expect(process.listeners('SIGINT')).toEqual(baselineSignals.SIGINT);
  expect(process.listeners('SIGTERM')).toEqual(baselineSignals.SIGTERM);
}

describe('startPlatformApp', () => {
  const originalEnv = { ...process.env };
  const originalExitCode = process.exitCode;
  let active: Awaited<ReturnType<typeof startPlatformApp>> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.exitCode = undefined;
    active = undefined;
    fakeRuntime();
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (active) await active.stop().catch(() => undefined);
    active = undefined;
    process.env = originalEnv;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    expectNoListeners();
  });

  it('passes custom adapters and runtime options without reading preset environment', async () => {
    process.env.PROSTO_TRUSTED_INGRESS_ADDRESSES = 'secret invalid JSON';
    process.env.PROSTO_TLS_CERTIFICATE_PATH = 'secret relative certificate';
    process.env.PROSTO_LOCALHOST = 'true';
    const configureServices = vi.fn();
    const descriptor = {
      owner: 'platform',
      ownerId: 'platform',
      payload: { name: 'platform' },
    } as const;

    active = await startPlatformApp({
      ...custom(),
      environment: 'stage',
      commandLineArgs: ['--x'],
      correlationId: 'trace',
      platformPersistenceDescriptor: descriptor,
      configureServices,
    });

    expect(builtOptions()).toMatchObject({
      configDir,
      adapters,
      environment: 'stage',
      commandLineArgs: ['--x'],
      correlationId: 'trace',
      platformPersistenceDescriptor: descriptor,
    });
    expect(mocks.fastify).not.toHaveBeenCalled();
    expect(mocks.persistence).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(active.url).toBeUndefined();
    const register = vi.fn();
    builtOptions().configureServices?.({ register } as unknown as Parameters<
      NonNullable<IRuntimeBuilderOptions['configureServices']>
    >[0]);
    expect(register).toHaveBeenCalledWith(
      HOST_RESTART_CAPABILITY_SERVICE_TOKEN,
      expect.objectContaining({
        requestGracefulShutdown: expect.any(Function),
      }),
    );
    expect(configureServices).toHaveBeenCalledOnce();
    expect(register.mock.invocationCallOrder[0]).toBeLessThan(
      configureServices.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it.each([
    { configDir: 'relative' },
    { ...custom(), host: 'localhost' },
    { configDir, adapters: { http: adapters.http } },
    { configDir, adapters: undefined },
  ])(
    'rejects invalid composition before building a runtime: %j',
    async (options) => {
      await expect(
        startPlatformApp(options as PlatformAppOptionsType),
      ).rejects.toThrow();
      expect(mocks.build).not.toHaveBeenCalled();
      expectNoListeners();
      active = await startPlatformApp(custom());
    },
  );

  describe('preset', () => {
    beforeEach(() => {
      process.env.PROSTO_TRUSTED_INGRESS_ADDRESSES =
        '["127.0.0.1"," 10.0.0.0/8 "]';
    });

    it('passes defaults, normalized ingress and optional static site to the constructors', async () => {
      active = await startPlatformApp({
        configDir,
        staticSiteRootPath: resolve('dist/site'),
      });
      expect(mocks.fastify).toHaveBeenCalledWith({
        host: '127.0.0.1',
        port: 3001,
        trustedProxies: ['127.0.0.1', '10.0.0.0/8'],
        tls: undefined,
        staticSite: { rootPath: resolve('dist/site') },
      });
      expect(mocks.persistence).toHaveBeenCalledOnce();
      expect(mocks.admin).toHaveBeenCalledOnce();
      expect(builtOptions().adapters).toEqual({
        http: expect.any(Object),
        persistence: expect.any(Object),
        admin: expect.any(Object),
      });
      expect(active.url?.href).toBe('https://127.0.0.1:3001/');
    });

    it.each(['', 'not JSON secret', '[]', '[""]', '[42]', '{}'])(
      'rejects missing or invalid ingress without exposing input: %j',
      async (input) => {
        process.env.PROSTO_TRUSTED_INGRESS_ADDRESSES = input;
        await expect(startPlatformApp({ configDir })).rejects.toThrow(
          'PROSTO_TRUSTED_INGRESS_ADDRESSES must be a non-empty JSON array',
        );
        expect(mocks.fastify).not.toHaveBeenCalled();
        expect(mocks.build).not.toHaveBeenCalled();
        process.env.PROSTO_TRUSTED_INGRESS_ADDRESSES = '["127.0.0.1"]';
        active = await startPlatformApp({ configDir });
      },
    );

    it('propagates adapter validation of invalid IP/CIDR without retaining the host', async () => {
      process.env.PROSTO_TRUSTED_INGRESS_ADDRESSES = '["not-an-ip-secret"]';
      const { FastifyHttpAdapter } = await vi.importActual<
        typeof import('@prosto/platform-adapter-fastify')
      >('@prosto/platform-adapter-fastify');
      mocks.fastify.mockImplementationOnce(
        (options: IFastifyHttpAdapterOptions) => {
          new FastifyHttpAdapter(options);
        },
      );
      await expect(startPlatformApp({ configDir })).rejects.toThrow(
        'Fastify HTTP adapter configuration is invalid.',
      );
      expect(mocks.fastify).toHaveBeenCalledWith(
        expect.objectContaining({ trustedProxies: ['not-an-ip-secret'] }),
      );
      process.env.PROSTO_TRUSTED_INGRESS_ADDRESSES = '["127.0.0.1"]';
      active = await startPlatformApp({ configDir });
    });

    it('prefers explicit TLS env paths over localhost PEM options', async () => {
      process.env.PROSTO_LOCALHOST = 'true';
      process.env.PROSTO_TLS_CERTIFICATE_PATH = resolve('explicit.crt');
      process.env.PROSTO_TLS_PRIVATE_KEY_PATH = resolve('explicit.key');
      active = await startPlatformApp({
        configDir,
        host: '0.0.0.0',
        port: 4000,
        localhostCertificatePath: resolve('local.crt'),
        localhostPrivateKeyPath: resolve('local.key'),
      });
      expect(mocks.fastify).toHaveBeenCalledWith(
        expect.objectContaining({
          host: '0.0.0.0',
          port: 4000,
          tls: {
            certificatePath: resolve('explicit.crt'),
            privateKeyPath: resolve('explicit.key'),
          },
        }),
      );
    });

    it('selects paired localhost PEM paths only in localhost mode', async () => {
      process.env.PROSTO_LOCALHOST = 'true';
      active = await startPlatformApp({
        configDir,
        localhostCertificatePath: resolve('local.crt'),
        localhostPrivateKeyPath: resolve('local.key'),
      });
      expect(mocks.fastify).toHaveBeenCalledWith(
        expect.objectContaining({
          tls: {
            certificatePath: resolve('local.crt'),
            privateKeyPath: resolve('local.key'),
          },
        }),
      );
    });

    it('resolves the default static site from the installed admin shell package', async () => {
      active = await startPlatformApp({ configDir });

      expect(mocks.fastify).toHaveBeenCalledWith(
        expect.objectContaining({
          staticSite: {
            rootPath: fileURLToPath(
              new URL(
                './dist',
                import.meta
                  .resolve('@prosto/platform-admin-shell/package.json'),
              ),
            ),
          },
        }),
      );
    });

    it.each([
      {
        env: { PROSTO_TLS_CERTIFICATE_PATH: resolve('cert') },
        message: 'must be set together',
      },
      {
        env: {
          PROSTO_TLS_PRIVATE_KEY_PATH: 'relative-key',
          PROSTO_TLS_CERTIFICATE_PATH: resolve('cert'),
        },
        message: 'PROSTO_TLS_PRIVATE_KEY_PATH must be an absolute path',
      },
      {
        env: { PROSTO_LOCALHOST: 'true' },
        message: 'localhostCertificatePath must be an absolute path',
      },
    ])(
      'rejects incomplete or relative TLS configuration: %j',
      async ({ env, message }) => {
        Object.assign(process.env, env);
        await expect(startPlatformApp({ configDir })).rejects.toThrow(message);
        expect(mocks.fastify).not.toHaveBeenCalled();
        expect(mocks.build).not.toHaveBeenCalled();
      },
    );

    it('rejects relative optional preset paths even when TLS is disabled', async () => {
      await expect(
        startPlatformApp({ configDir, staticSiteRootPath: 'relative' }),
      ).rejects.toThrow('staticSiteRootPath must be an absolute path');
      await expect(
        startPlatformApp({ configDir, localhostPrivateKeyPath: 'relative' }),
      ).rejects.toThrow('localhostPrivateKeyPath must be an absolute path');
    });
  });

  it('accepts degraded startup and logs only safe fields', async () => {
    const runtime = fakeRuntime();
    runtime.reports.startup.status = RuntimeStartupStatus.Degraded;
    runtime.reports.startup.degraded = true;
    runtime.reports.startup.failedModules = ['secret-module'];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    active = await startPlatformApp(custom());
    expect(warn).toHaveBeenCalledWith(
      'Platform application started in a degraded state.',
      { status: 'degraded', failedCount: 1 },
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-module');
  });

  it.each(['failed', 'not-started', 'missing-report'] as const)(
    'rejects silent %s startup and frees the host',
    async (scenario) => {
      const runtime = fakeRuntime();
      if (scenario === 'failed') {
        runtime.reports.startup.status = RuntimeStartupStatus.Failed;
      }
      if (scenario === 'not-started') runtime.started = false;
      if (scenario === 'missing-report') {
        (runtime.reports as { startup?: unknown }).startup = undefined;
      }
      if (scenario === 'failed') runtime.stopped = true;
      const error = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      await expect(startPlatformApp(custom())).rejects.toThrow(
        'Platform application startup failed.',
      );
      expect(runtime.stop).toHaveBeenCalledTimes(scenario === 'failed' ? 0 : 1);
      expect(error).toHaveBeenCalledWith(
        'Platform application startup failed.',
        {
          status:
            scenario === 'missing-report'
              ? 'missing'
              : scenario === 'failed'
                ? 'failed'
                : 'success',
        },
      );
      expectNoListeners();
      fakeRuntime();
      active = await startPlatformApp(custom());
    },
  );

  it('preserves a thrown startup exception and sanitizes failed cleanup logs', async () => {
    const runtime = fakeRuntime();
    const original = new Error('secret startup exception');
    runtime.start.mockRejectedValueOnce(original);
    runtime.stop.mockRejectedValueOnce(new Error('secret shutdown exception'));
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await expect(startPlatformApp(custom())).rejects.toBe(original);
    expect(error).toHaveBeenCalledWith(
      'Platform application startup cleanup failed.',
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain('secret');
    expectNoListeners();
    fakeRuntime();
    active = await startPlatformApp(custom());
  });

  it('reserves the host during pending startup and releases it after stop', async () => {
    const runtime = fakeRuntime();
    const pending = deferred();
    runtime.start.mockReturnValueOnce(pending.promise);
    const first = startPlatformApp(custom());
    await expect(startPlatformApp(custom())).rejects.toThrow('already active');
    expect(mocks.build).toHaveBeenCalledTimes(1);
    pending.resolve();
    active = await first;
    await expect(startPlatformApp(custom())).rejects.toThrow('already active');
    await active.stop();
    active = undefined;
    expect(runtime.stop).toHaveBeenCalledOnce();
    expectNoListeners();
    fakeRuntime();
    active = await startPlatformApp(custom());
  });

  it('shares one shutdown across signals and repeated stop calls', async () => {
    const runtime = fakeRuntime();
    const pending = deferred();
    runtime.stop.mockReturnValueOnce(pending.promise);
    active = await startPlatformApp(custom());
    const sigint = signalHandler('SIGINT');
    const sigterm = signalHandler('SIGTERM');
    const stop = active.stop();
    expect(active.stop()).toBe(stop);
    sigint('SIGINT');
    sigterm('SIGTERM');
    expect(runtime.stop).toHaveBeenCalledOnce();
    pending.resolve();
    await stop;
    expect(process.exitCode).toBe(0);
    expectNoListeners();
  });

  it.each(['issues', 'rejection'] as const)(
    'rejects shutdown with %s and releases signals/host',
    async (scenario) => {
      const runtime = fakeRuntime();
      const error = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      if (scenario === 'issues') {
        runtime.reports.shutdown.issues = ['secret issue'];
      } else {
        runtime.stop.mockRejectedValueOnce(new Error('secret failure'));
      }
      active = await startPlatformApp(custom());
      await expect(active.stop()).rejects.toThrow(
        'Platform application failed to stop.',
      );
      expect(process.exitCode).toBe(1);
      expect(JSON.stringify(error.mock.calls)).not.toContain('secret');
      expect(error).toHaveBeenCalledWith(
        'Platform application failed to stop.',
      );
      expectNoListeners();
      active = undefined;
      fakeRuntime();
      active = await startPlatformApp(custom());
    },
  );

  it.each(['success', 'failure'] as const)(
    'flushes a restart for 100ms and keeps exit 75 through SIGTERM and %s stop',
    async (scenario) => {
      vi.useFakeTimers();
      const runtime = fakeRuntime();
      if (scenario === 'failure') {
        runtime.stop.mockRejectedValueOnce(new Error('secret shutdown'));
      }
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      let restart: IHostRestartCapability | undefined;
      active = await startPlatformApp(custom());
      const services = {
        register: vi.fn((_token: unknown, value: IHostRestartCapability) => {
          restart = value;
        }),
      };
      builtOptions().configureServices?.(
        services as unknown as Parameters<
          NonNullable<IRuntimeBuilderOptions['configureServices']>
        >[0],
      );
      if (!restart) throw new Error('Restart capability was not registered.');
      const first = (
        restart as IHostRestartCapability
      ).requestGracefulShutdown();
      expect(
        (restart as IHostRestartCapability).requestGracefulShutdown(),
      ).toBe(first);
      signalHandler('SIGTERM')('SIGTERM');
      expect(runtime.stop).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(99);
      expect(runtime.stop).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      if (scenario === 'failure') {
        await expect(first).rejects.toThrow(
          'Platform application failed to stop.',
        );
      } else {
        await first;
      }
      expect(runtime.stop).toHaveBeenCalledOnce();
      expect(process.exitCode).toBe(75);
      expectNoListeners();
    },
  );
});
