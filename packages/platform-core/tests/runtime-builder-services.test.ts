import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ADMIN_ASSET_CATALOG_SERVICE_TOKEN,
  PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN,
  createServiceToken,
  type IAdminAssetCatalog,
  type IEventBus,
  type IPlatformRuntimeCatalog,
  type ISecretsRedactor,
  type IServiceRegistry,
} from '@prosto/platform-sdk/platform';
import {
  BootstrapCoordinator,
  BootstrapStage,
  type IBootstrapInput,
  type IBootstrapPipeline,
} from '@/bootstrap/index.js';
import { RuntimeErrorCodes } from '@/common/index.js';
import type { IRuntimeFailureDiagnostic } from '@/diagnostics/index.js';
import type { IModuleContextFactory } from '@/modularity/index.js';
import type { IPlatformConfig } from '@/runtime/interfaces/index.js';
import {
  RuntimeBuilder,
  RuntimeServiceConfigurationError,
} from '@/runtime/index.js';
import { ServiceAlreadyRegisteredError } from '@/services/index.js';

const TEST_SERVICE_TOKEN = createServiceToken<string>(
  'platform-core-tests.runtime-builder-service',
);
const temporaryDirectories: string[] = [];

class InspectableRuntimeBuilder extends RuntimeBuilder {
  readonly phases: string[] = [];
  adminAssetCatalog: IAdminAssetCatalog | undefined;
  configuredService: string | undefined;
  platformRuntimeCatalog: IPlatformRuntimeCatalog | undefined;

  protected override _createModuleContextFactory(
    environment: string,
    config: IPlatformConfig,
    eventBus: IEventBus,
    serviceRegistry: IServiceRegistry,
    secretsRedactor?: ISecretsRedactor,
  ): IModuleContextFactory {
    this.phases.push('module-context-factory');
    this.configuredService = serviceRegistry.resolve(TEST_SERVICE_TOKEN);
    this.adminAssetCatalog = serviceRegistry.resolve(
      ADMIN_ASSET_CATALOG_SERVICE_TOKEN,
    );
    this.platformRuntimeCatalog = serviceRegistry.resolve(
      PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN,
    );

    return super._createModuleContextFactory(
      environment,
      config,
      eventBus,
      serviceRegistry,
      secretsRedactor,
    );
  }
}

describe('RuntimeBuilder service composition', () => {
  it('runs the configurator before module context construction', () => {
    // Arrange
    const builder = new InspectableRuntimeBuilder();

    // Act
    const runtime = builder.build({
      configureServices: (services) => {
        builder.phases.push('configure-services');
        services.register(TEST_SERVICE_TOKEN, 'available');
      },
    });

    // Assert
    expect(runtime.started).toBe(false);
    expect(builder.phases).toEqual([
      'configure-services',
      'module-context-factory',
    ]);
    expect(builder.configuredService).toBe('available');
  });

  it('does not invoke a configurator when it is omitted', () => {
    // Arrange
    const builder = new InspectableRuntimeBuilder();

    // Act
    builder.build({});

    // Assert
    expect(builder.phases).toEqual(['module-context-factory']);
    expect(builder.configuredService).toBeUndefined();
  });

  it('registers administration catalogs before module contexts are created', () => {
    // Arrange
    const builder = new InspectableRuntimeBuilder();

    // Act
    builder.build({});

    // Assert
    expect(builder.adminAssetCatalog).toBeDefined();
    expect(builder.platformRuntimeCatalog?.getSnapshot()).toEqual({
      modules: [],
      name: 'Prosto Platform',
      version: '0.0.0',
    });
  });

  it('propagates duplicate registrations and clears the partial registry', () => {
    // Arrange
    const builder = new RuntimeBuilder();
    let registry: IServiceRegistry | undefined;

    // Act
    const build = (): void => {
      builder.build({
        configureServices: (services) => {
          registry = services;
          services.register(TEST_SERVICE_TOKEN, 'first');
          services.register(TEST_SERVICE_TOKEN, 'second');
        },
      });
    };

    // Assert
    expect(build).toThrow(ServiceAlreadyRegisteredError);
    expect(registry?.has(TEST_SERVICE_TOKEN)).toBe(false);
  });

  it('rejects asynchronous service configuration synchronously', () => {
    // Arrange
    const builder = new RuntimeBuilder();

    // Act
    const build = (): void => {
      builder.build({
        configureServices: async () => undefined,
      });
    };

    // Assert
    expect(build).toThrow(RuntimeServiceConfigurationError);

    try {
      build();
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeServiceConfigurationError);
      expect((error as RuntimeServiceConfigurationError).code).toBe(
        'ASYNC_SERVICE_CONFIGURATION_NOT_SUPPORTED',
      );
    }
  });
});

describe('BootstrapCoordinator abort handling', () => {
  it('adds a platform diagnostic when the aborting stage has none', async () => {
    // Arrange
    const pipeline: IBootstrapPipeline = {
      async execute(context) {
        context.stageOutcomes.push({
          stage: BootstrapStage.Discover,
          ok: false,
        });
        context.abort = true;

        return context;
      },
    };
    const coordinator = new BootstrapCoordinator(pipeline);

    // Act
    const result = await coordinator.coordinate(createBootstrapInput());

    // Assert
    expect(result.loadedModules).toEqual([]);
    expect(result.failedDiagnostics).toEqual([
      expect.objectContaining({
        moduleId: 'platform',
        phase: BootstrapStage.Discover,
        errorCode: RuntimeErrorCodes.BootstrapAborted,
      }),
    ]);
  });

  it('does not duplicate a specific diagnostic from the aborting stage', async () => {
    // Arrange
    const diagnostic: IRuntimeFailureDiagnostic = {
      moduleId: 'platform',
      phase: BootstrapStage.Discover,
      errorCode: RuntimeErrorCodes.LoadManifestFiled,
      message: 'Discovery failed.',
      remediationHint: 'Restore the discovery directory.',
    };
    const pipeline: IBootstrapPipeline = {
      async execute(context) {
        context.stageOutcomes.push({
          stage: BootstrapStage.Discover,
          ok: false,
        });
        context.failedDiagnostics.push(diagnostic);
        context.abort = true;

        return context;
      },
    };
    const coordinator = new BootstrapCoordinator(pipeline);

    // Act
    const result = await coordinator.coordinate(createBootstrapInput());

    // Assert
    expect(result.failedDiagnostics).toEqual([diagnostic]);
  });
});

describe('PlatformRuntime bootstrap readiness', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true })),
    );
  });

  it('reports a missing discovery directory as failed and not started', async () => {
    // Arrange
    const rootDirectory = await createTemporaryDirectory();
    const runtime = createRuntimeForDiscoveryPath(
      join(rootDirectory, 'missing'),
      join(rootDirectory, 'probing'),
    );

    // Act
    await runtime.start();

    // Assert
    expect(runtime.started).toBe(false);
    expect(runtime.reports.startup?.status).toBe('failed');
    expect(runtime.reports.startup?.failedModules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          errorCode: RuntimeErrorCodes.BootstrapAborted,
        }),
      ]),
    );

    await runtime.stop();
  });

  it('starts successfully with an existing empty discovery directory', async () => {
    // Arrange
    const rootDirectory = await createTemporaryDirectory();
    const discoveryDirectory = join(rootDirectory, 'empty');
    await mkdir(discoveryDirectory);
    const runtime = createRuntimeForDiscoveryPath(
      discoveryDirectory,
      join(rootDirectory, 'probing'),
    );

    // Act
    await runtime.start();

    // Assert
    expect(runtime.started).toBe(true);
    expect(runtime.reports.startup?.status).toBe('success');

    await runtime.stop();
  });
});

function createBootstrapInput(): IBootstrapInput {
  return {
    policyMode: 'strict',
    runtimeVersion: { sdkVersion: '0.0.0' },
    correlationId: 'test-correlation-id',
    startupStartedAt: new Date().toISOString(),
    services: {
      register: (): void => undefined,
      override: (): void => undefined,
      resolve: (): undefined => undefined,
      resolveRequired: (): never => {
        throw new Error('No services are registered in this test.');
      },
      has: (): false => false,
      unregister: (): void => undefined,
    },
  };
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'prosto-platform-core-'));
  temporaryDirectories.push(directory);

  return directory;
}

function createRuntimeForDiscoveryPath(
  discoveryPath: string,
  probingPath: string,
) {
  return new RuntimeBuilder().build({
    commandLineArgs: [
      `--platform:discoveryPath=${discoveryPath}`,
      `--platform:probingPath=${probingPath}`,
    ],
  });
}
