import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  IHttpEndpointRegistrarProvider,
  IHttpRuntimeAdapter,
  IPlatformAdminAdapter,
  IPlatformRuntimeAdapter,
  IPersistenceDescriptorRegistry,
  IPersistenceRuntimeAdapter,
} from '@prosto/platform-sdk/platform';
import type {
  IBootstrapContext,
  IBootstrapCoordinator,
} from '@/bootstrap/index.js';
import { PlatformModuleEnvelope } from '@/modularity/index.js';
import {
  platformConfigSchema,
  AdapterLifecycleOrchestrator,
  PlatformRuntime,
  RuntimeAdapterCompositionError,
  RuntimeAdapterLifecycleError,
  RuntimeBuilder,
} from '@/runtime/index.js';
import {
  AdminAssetCatalog,
  PlatformRuntimeCatalog,
} from '@/administration/index.js';
import { RuntimeErrorCodes } from '@/common/index.js';
import { DiagnosticsReporter } from '@/diagnostics/index.js';
import type { IModuleLifecycleOrchestrator } from '@/modularity/index.js';
import type { IPlatformConfig } from '@/runtime/interfaces/index.js';
import { InMemoryServiceRegistry } from '@/services/index.js';

const temporaryDirectories: string[] = [];

describe('Runtime adapter composition validation', () => {
  it('rejects duplicate adapter IDs before service configuration', () => {
    // Arrange
    const adapters = createAdapters();
    const configureServices = (): never => {
      throw new Error('Service configuration must not run.');
    };
    adapters.http = createHttpAdapter(adapters.persistence.id);

    // Act
    const build = (): void => {
      new RuntimeBuilder().build({ adapters, configureServices });
    };

    // Assert
    expectCompositionError(build, 'DUPLICATE_ADAPTER_ID');
  });

  it('rejects a reused adapter instance before role mismatch diagnostics', () => {
    // Arrange
    const reused = createAdminAdapter();
    const adapters = createAdapters();
    adapters.admin = reused;
    adapters.persistence = reused as unknown as IPersistenceRuntimeAdapter;

    // Act
    const build = (): void => {
      new RuntimeBuilder().build({ adapters });
    };

    // Assert
    expectCompositionError(build, 'REUSED_ADAPTER_INSTANCE');
  });

  it.each([
    ['registerPlatform'],
    ['createRegistrar'],
    ['rollback'],
    ['seal'],
  ] as const)(
    'rejects a persistence registry without callable %s',
    (member) => {
      // Arrange
      const adapters = createAdapters();
      adapters.persistence = {
        ...adapters.persistence,
        descriptors: {
          ...createPersistenceRegistry(),
          [member]: undefined,
        } as unknown as IPersistenceDescriptorRegistry,
      };

      // Act
      const build = (): void => {
        new RuntimeBuilder().build({ adapters });
      };

      // Assert
      expectCompositionError(build, 'INVALID_ADAPTER');
    },
  );

  it.each(['createRegistrar', 'commit', 'rollback'] as const)(
    'rejects an HTTP registrar provider without callable %s',
    (member) => {
      // Arrange
      const adapters = createAdapters();
      adapters.http = {
        ...adapters.http,
        endpoints: {
          ...createHttpRegistrarProvider(),
          [member]: undefined,
        } as unknown as IHttpEndpointRegistrarProvider,
      };

      // Act
      const build = (): void => {
        new RuntimeBuilder().build({ adapters });
      };

      // Assert
      expectCompositionError(build, 'INVALID_ADAPTER');
    },
  );

  it('builds with structurally conforming SDK-only adapter fakes', () => {
    // Arrange
    const adapters = createAdapters();

    // Act
    const runtime = new RuntimeBuilder().build({ adapters });

    // Assert
    expect(runtime.started).toBe(false);
    expect(runtime.stopped).toBe(false);
  });
});

describe('Runtime adapter lifecycle boundaries', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true })),
    );
  });

  it.each([false, true])(
    'rejects modules adapter configuration when adapters configuration is present: %s',
    async (hasAdapterConfiguration) => {
      // Arrange
      const rootDirectory = await createTemporaryDirectory();
      const discoveryPath = join(rootDirectory, 'modules');
      await mkdir(discoveryPath);
      const events: string[] = [];
      const runtime = new ConfigurationRuntimeBuilder(
        platformConfigSchema.parse({
          adapters: hasAdapterConfiguration ? { http: { port: 3000 } } : {},
          modules: { http: { port: 3000 } },
        }),
      ).build({
        adapters: createAdapters(events),
        commandLineArgs: createRuntimeArguments(
          discoveryPath,
          join(rootDirectory, 'probing'),
        ),
      });

      // Act / Assert
      await expect(runtime.start()).rejects.toMatchObject({
        code: 'MISPLACED_ADAPTER_CONFIGURATION',
      });
      expect(events).toEqual([]);
    },
  );

  it.each([
    ['persistence', 'persistence'],
    ['http', 'persistence'],
  ] as const)(
    'converts a throwing %s registrar provider into a lifecycle failure',
    async (provider, expectedAdapterId) => {
      // Arrange
      const rootDirectory = await createTemporaryDirectory();
      const events: string[] = [];
      const adapters = createAdapters(events);
      const error = new Error('Registrar creation failed.');

      if (provider === 'persistence') {
        adapters.persistence.descriptors.createRegistrar = (): never => {
          throw error;
        };
      } else {
        adapters.http.endpoints.createRegistrar = (): never => {
          throw error;
        };
      }

      const runtime = createRuntime(events, {
        adapters,
        discoveryPath: await createEmptyDiscoveryDirectory(rootDirectory),
        probingPath: join(rootDirectory, 'probing'),
      });

      // Act / Assert
      await expect(runtime.start()).rejects.toMatchObject({
        adapterId: expectedAdapterId,
        stage: 'initialize',
      });
      expect(events).toEqual(
        provider === 'persistence' ? [] : ['rollback:persistence:persistence'],
      );
      expect(runtime.stopped).toBe(true);
    },
  );

  it.each([
    ['persistence', 'persistence'],
    ['http', 'persistence'],
  ] as const)(
    'rejects a %s registrar without register and rolls back created scopes',
    async (provider, expectedAdapterId) => {
      // Arrange
      const rootDirectory = await createTemporaryDirectory();
      const events: string[] = [];
      const adapters = createAdapters(events);

      if (provider === 'persistence') {
        adapters.persistence.descriptors.createRegistrar = () => ({}) as never;
      } else {
        adapters.http.endpoints.createRegistrar = () => ({}) as never;
      }

      const runtime = createRuntime(events, {
        adapters,
        discoveryPath: await createEmptyDiscoveryDirectory(rootDirectory),
        probingPath: join(rootDirectory, 'probing'),
      });

      // Act / Assert
      await expect(runtime.start()).rejects.toMatchObject({
        adapterId: expectedAdapterId,
        stage: 'initialize',
      });
      expect(events).toEqual(
        expect.arrayContaining([
          `rollback:persistence:${expectedAdapterId}`,
          `rollback:http:${expectedAdapterId}`,
        ]),
      );
    },
  );

  it.each([
    ['initialize', 'persistence', 'persistence', []],
    ['initialize', 'http', 'http', ['stop:persistence']],
    [
      'initialize',
      'admin',
      'platform-admin',
      ['stop:http', 'stop:persistence'],
    ],
    [
      'start',
      'persistence',
      'persistence',
      ['stop:http', 'stop:admin', 'stop:persistence'],
    ],
    [
      'start',
      'admin',
      'platform-admin',
      ['stop:http', 'stop:admin', 'stop:persistence'],
    ],
    ['start', 'http', 'http', ['stop:http', 'stop:admin', 'stop:persistence']],
  ] as const)(
    'rolls back the %s %s barrier in reverse dependency order',
    async (stage, role, adapterId, expectedStops) => {
      // Arrange
      const rootDirectory = await createTemporaryDirectory();
      const events: string[] = [];
      const runtime = createRuntime(events, {
        adapters: createAdapters(events, {
          [role]: {
            [stage]: (): never => {
              throw new Error('Expected failure.');
            },
          },
        }),
        discoveryPath: await createEmptyDiscoveryDirectory(rootDirectory),
        probingPath: join(rootDirectory, 'probing'),
      });

      // Act / Assert
      await expect(runtime.start()).rejects.toMatchObject({ adapterId, stage });
      expect(events.filter((event) => event.startsWith('stop:'))).toEqual(
        expectedStops,
      );
      expectFailedStartup(runtime, adapterId, stage);
    },
  );

  it('preserves a startup failure when an adapter stop fails during rollback', async () => {
    // Arrange
    const rootDirectory = await createTemporaryDirectory();
    const events: string[] = [];
    const runtime = createRuntime(events, {
      adapters: createAdapters(events, {
        admin: {
          start: (): never => {
            throw new Error('Admin start failed.');
          },
        },
        http: {
          stop: (): never => {
            throw new Error('HTTP stop failed.');
          },
        },
      }),
      discoveryPath: await createEmptyDiscoveryDirectory(rootDirectory),
      probingPath: join(rootDirectory, 'probing'),
    });

    // Act / Assert
    await expect(runtime.start()).rejects.toMatchObject({
      adapterId: 'platform-admin',
      stage: 'start',
    });
    expect(events.filter((event) => event.startsWith('stop:'))).toEqual([
      'stop:http',
      'stop:admin',
      'stop:persistence',
    ]);
    expect(runtime.reports.shutdown?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ moduleId: 'http' })]),
    );
    expect(runtime.reports.startup?.adapters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adapter: { id: 'http', type: 'adapter' },
          stage: 'stop',
          status: 'failed',
        }),
      ]),
    );
  });

  it('continues rollback after a module stop failure', async () => {
    // Arrange
    const rootDirectory = await createTemporaryDirectory();
    const events: string[] = [];
    const builder = new FixedBootstrapRuntimeBuilder(
      createStartedModule(events, true),
    );
    const runtime = builder.build({
      adapters: createAdapters(events, {
        admin: {
          start: (): never => {
            throw new Error('Admin start failed.');
          },
        },
      }),
      commandLineArgs: createRuntimeArguments(
        await createEmptyDiscoveryDirectory(rootDirectory),
        join(rootDirectory, 'probing'),
      ),
    });

    // Act / Assert
    await expect(runtime.start()).rejects.toBeInstanceOf(
      RuntimeAdapterLifecycleError,
    );
    expect(events).toEqual(
      expect.arrayContaining([
        'stop:http',
        'stop:admin',
        'module:stop',
        'stop:persistence',
      ]),
    );
    expect(runtime.reports.shutdown?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moduleId: 'test-module' }),
      ]),
    );
    expect(runtime.reports.startup?.status).toBe('failed');
  });

  it('preserves an adapter failure when application cleanup fails', async () => {
    // Arrange
    const events: string[] = [];
    const adapters = createAdapters(events, {
      persistence: {
        initialize: (): never => {
          throw new Error('Persistence initialization failed.');
        },
      },
    });
    const config = platformConfigSchema.parse({});
    const services = new InMemoryServiceRegistry();
    const runtimeReference = {} as { runtime: PlatformRuntime };
    const adaptersLifecycle = new AdapterLifecycleOrchestrator(
      adapters,
      config,
      'test',
      services,
      () => runtimeReference.runtime,
    );
    const runtime = new PlatformRuntime(
      config,
      new DiagnosticsReporter(),
      createEmptyBootstrapCoordinator(),
      {} as IModuleLifecycleOrchestrator,
      services,
      new PlatformRuntimeCatalog('Test platform', '1.0.0'),
      new AdminAssetCatalog(),
      {
        adapters,
        onStopped: (): never => {
          throw new Error('Application cleanup failed.');
        },
      },
      adaptersLifecycle,
    );
    runtimeReference.runtime = runtime;

    // Act / Assert
    await expect(runtime.start()).rejects.toMatchObject({
      adapterId: 'persistence',
      stage: 'initialize',
    });
    expectFailedStartup(runtime, 'persistence', 'initialize');
    expect(runtime.reports.shutdown?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moduleId: 'platform' }),
      ]),
    );
  });

  it('reports an unexpected bootstrap exception without exposing its message', async () => {
    // Arrange
    const adapters = createAdapters();
    const config = platformConfigSchema.parse({});
    const services = new InMemoryServiceRegistry();
    const bootstrapFailure = new Error('secret bootstrap failure');
    const runtimeReference = {} as { runtime: PlatformRuntime };
    const adaptersLifecycle = new AdapterLifecycleOrchestrator(
      adapters,
      config,
      'test',
      services,
      () => runtimeReference.runtime,
    );
    const runtime = new PlatformRuntime(
      config,
      new DiagnosticsReporter(),
      {
        async coordinate(): Promise<IBootstrapContext> {
          throw bootstrapFailure;
        },
      },
      {} as IModuleLifecycleOrchestrator,
      services,
      new PlatformRuntimeCatalog('Test platform', '1.0.0'),
      new AdminAssetCatalog(),
      { adapters, correlationId: 'test-correlation-id' },
      adaptersLifecycle,
    );
    runtimeReference.runtime = runtime;

    // Act / Assert
    await expect(runtime.start()).rejects.toThrow(bootstrapFailure);
    expect(runtime.reports.startup).toMatchObject({
      status: 'failed',
      correlationId: 'test-correlation-id',
      failedModules: [
        expect.objectContaining({
          moduleId: 'platform',
          errorCode: RuntimeErrorCodes.StartupFailed,
        }),
      ],
    });
    expect(JSON.stringify(runtime.reports.startup)).not.toContain(
      bootstrapFailure.message,
    );
    expect(runtime.reports.shutdown).toBeDefined();
  });
});

describe('Startup diagnostic status', () => {
  it('marks skipped feature modules as degraded when bootstrap did not fail fatally', () => {
    // Arrange
    const failure = {
      moduleId: 'optional-module',
      phase: 'lifecycle' as const,
      errorCode: RuntimeErrorCodes.LifecycleStartFailed,
      message: 'Optional module failed.',
      remediationHint: 'Inspect the optional module.',
    };

    // Act
    const report = new DiagnosticsReporter().createStartupReport({
      policyMode: 'best-effort',
      correlationId: 'test-correlation-id',
      startedAt: '2026-01-01T00:00:00.000Z',
      loadedModules: [],
      skippedModules: [{ moduleId: failure.moduleId, reason: failure }],
      failedModules: [failure],
      hasFatalFailure: false,
      adapters: [],
    });

    // Assert
    expect(report.status).toBe('degraded');
    expect(report.degraded).toBe(true);
  });
});

function expectCompositionError(
  operation: () => void,
  code: RuntimeAdapterCompositionError['code'],
): void {
  expect(operation).toThrow(RuntimeAdapterCompositionError);

  try {
    operation();
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

function expectFailedStartup(
  runtime: ReturnType<RuntimeBuilder['build']>,
  adapterId: string,
  stage: RuntimeAdapterLifecycleError['stage'],
): void {
  expect(runtime.started).toBe(false);
  expect(runtime.stopped).toBe(true);
  expect(runtime.startedModuleIds).toEqual([]);
  expect(runtime.reports.startup).toMatchObject({ status: 'failed' });
  expect(runtime.reports.startup?.adapters).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        adapter: { id: adapterId, type: 'adapter' },
        stage,
        status: 'failed',
      }),
    ]),
  );
  expect(runtime.reports.shutdown).toBeDefined();
}

function createRuntime(
  events: string[],
  options: {
    readonly adapters?: ReturnType<typeof createAdapters>;
    readonly configDir?: string;
    readonly discoveryPath: string;
    readonly probingPath: string;
  },
) {
  return new RuntimeBuilder().build({
    adapters: options.adapters ?? createAdapters(events),
    configDir: options.configDir,
    commandLineArgs: createRuntimeArguments(
      options.discoveryPath,
      options.probingPath,
    ),
  });
}

function createRuntimeArguments(
  discoveryPath: string,
  probingPath: string,
): string[] {
  return [
    `--platform:discoveryPath=${discoveryPath}`,
    `--platform:probingPath=${probingPath}`,
  ];
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'prosto-runtime-adapter-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function createEmptyDiscoveryDirectory(
  rootDirectory: string,
): Promise<string> {
  const directory = join(rootDirectory, 'modules');
  await mkdir(directory);
  return directory;
}

function createAdapters(
  events: string[] = [],
  overrides: Partial<
    Record<
      'admin' | 'persistence' | 'http',
      Partial<Pick<IPlatformRuntimeAdapter, 'initialize' | 'start' | 'stop'>>
    >
  > = {},
): {
  admin: IPlatformAdminAdapter;
  persistence: IPersistenceRuntimeAdapter;
  http: IHttpRuntimeAdapter;
} {
  return {
    admin: createAdminAdapter(events, overrides.admin),
    persistence: createPersistenceAdapter(
      'persistence',
      events,
      overrides.persistence,
    ),
    http: createHttpAdapter('http', events, overrides.http),
  };
}

function createAdminAdapter(
  events: string[] = [],
  lifecycle: Partial<
    Pick<IPlatformRuntimeAdapter, 'initialize' | 'start' | 'stop'>
  > = {},
): IPlatformAdminAdapter {
  return {
    id: 'platform-admin',
    role: 'admin',
    initialize: (context) => {
      events.push('initialize:admin');
      return lifecycle.initialize?.(context);
    },
    start: (context) => {
      events.push('start:admin');
      return lifecycle.start?.(context);
    },
    stop: (context) => {
      events.push('stop:admin');
      return lifecycle.stop?.(context);
    },
  };
}

function createPersistenceAdapter(
  id: string,
  events: string[] = [],
  lifecycle: Partial<
    Pick<IPlatformRuntimeAdapter, 'initialize' | 'start' | 'stop'>
  > = {},
): IPersistenceRuntimeAdapter {
  return {
    id,
    role: 'persistence',
    descriptors: createPersistenceRegistry(events),
    initialize: (context) => {
      events.push('initialize:persistence');
      return lifecycle.initialize?.(context);
    },
    start: (context) => {
      events.push('start:persistence');
      return lifecycle.start?.(context);
    },
    stop: (context) => {
      events.push('stop:persistence');
      return lifecycle.stop?.(context);
    },
  };
}

function createHttpAdapter(
  id: string,
  events: string[] = [],
  lifecycle: Partial<
    Pick<IPlatformRuntimeAdapter, 'initialize' | 'start' | 'stop'>
  > = {},
): IHttpRuntimeAdapter {
  return {
    id,
    role: 'http',
    endpoints: createHttpRegistrarProvider(events),
    initialize: (context) => {
      events.push('initialize:http');
      return lifecycle.initialize?.(context);
    },
    start: (context) => {
      events.push('start:http');
      return lifecycle.start?.(context);
    },
    stop: (context) => {
      events.push('stop:http');
      return lifecycle.stop?.(context);
    },
  };
}

function createPersistenceRegistry(
  events: string[] = [],
): IPersistenceDescriptorRegistry {
  return {
    registerPlatform: (): void => undefined,
    createRegistrar: () => ({ register: (): void => undefined }),
    rollback: (owner): void => {
      events.push(`rollback:persistence:${owner.id}`);
    },
    seal: (): readonly [] => [],
  };
}

function createHttpRegistrarProvider(
  events: string[] = [],
): IHttpEndpointRegistrarProvider {
  return {
    createRegistrar: () => ({ register: (): void => undefined }),
    commit: (): void => undefined,
    rollback: (owner): void => {
      events.push(`rollback:http:${owner.id}`);
    },
  };
}

function createStartedModule(
  events: string[],
  failsToStop: boolean,
): PlatformModuleEnvelope {
  const module = new PlatformModuleEnvelope({
    dependencies: [],
    id: 'test-module',
    sdkVersion: '*',
    title: 'Test module',
    version: '1.0.0',
  });
  module.moduleInstance = {
    init: (): void => undefined,
    start: (): void => undefined,
    stop: (): void => {
      events.push('module:stop');
      if (failsToStop) throw new Error('Module stop failed.');
    },
  };
  return module;
}

function createEmptyBootstrapCoordinator(): IBootstrapCoordinator {
  return {
    async coordinate(): Promise<IBootstrapContext> {
      return {
        aborted: false,
        failedDiagnostics: [],
        loadedModules: [],
        startedModules: [],
        moduleEnvelopes: [],
        policyMode: 'strict',
        skippedModuleIds: [],
        stageOutcomes: [],
      };
    },
  };
}

class FixedBootstrapRuntimeBuilder extends RuntimeBuilder {
  constructor(private readonly _module: PlatformModuleEnvelope) {
    super();
  }

  protected override _createBootstrapCoordinator(): IBootstrapCoordinator {
    const module = this._module;

    return {
      async coordinate(): Promise<IBootstrapContext> {
        return {
          aborted: false,
          failedDiagnostics: [],
          loadedModules: [module],
          startedModules: [module],
          moduleEnvelopes: [module],
          policyMode: 'strict',
          skippedModuleIds: [],
          stageOutcomes: [],
        };
      },
    };
  }
}

class ConfigurationRuntimeBuilder extends RuntimeBuilder {
  constructor(private readonly _config: IPlatformConfig) {
    super();
  }

  protected override _buildPlatformConfig(): IPlatformConfig {
    return this._config;
  }
}
