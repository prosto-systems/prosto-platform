import pkg from '../../package.json' with { type: 'json' };
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  ADMIN_ASSET_CATALOG_SERVICE_TOKEN,
  type IEventBus,
  type ISecretsRedactor,
  type IServiceRegistry,
  HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN,
  PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN,
  SecretsRedactor,
} from '@prosto/platform-sdk/platform';
import {
  AdminAssetCatalog,
  PlatformRuntimeCatalog,
} from '@/administration/index.js';
import type {
  IPlatformConfig,
  IPlatformRuntime,
  IRuntimeBuilder,
  IRuntimeBuilderOptions,
} from './interfaces/index.js';
import {
  BootstrapCoordinator,
  BootstrapPipeline,
  CopyStage,
  DiscoverStage,
  type IBootstrapCoordinator,
  LoadStage,
  ModulesInitializationStage,
  ModulesStartStage,
  PersistenceInitializationStage,
  ResolveDependenciesStage,
  ValidateStage,
} from '@/bootstrap/index.js';
import { ConfigurationBuilder, loadJsonFileSync } from '@/common/index.js';
import {
  DiagnosticReportBuilder,
  DiagnosticsReporter,
} from '@/diagnostics/index.js';
import { InMemoryEventBus } from '@/events/index.js';
import { ConsoleModuleLoggerFactory } from '@/logging/index.js';
import {
  CompatibilityValidationStrategy,
  type IModuleContextFactory,
  type IModuleLifecycleOrchestrator,
  ManifestValidationStrategy,
  ModuleContextFactory,
  ModuleLifecycleOrchestrator,
  StartupPolicyEvaluator,
} from '@/modularity/index.js';
import { InMemoryServiceRegistry } from '@/services/index.js';
import { RuntimeServiceConfigurationError } from './errors/index.js';
import { AdapterLifecycleOrchestrator } from './adapters/index.js';
import { PlatformRuntime } from './platform-runtime.js';
import {
  platformConfigSchema,
  platformLocalAdapterConfigSchema,
} from './schemas/index.js';

/**
 * @alpha
 * Builder for creating platform runtime instances.
 * Acts as the composition root for wiring all dependencies.
 */
export class RuntimeBuilder implements IRuntimeBuilder {
  /**
   * Creates a runtime from package defaults and deployment overrides.
   *
   * Module packages are discovered from `platform.discoveryPath`; executable
   * modules are not accepted as builder options.
   *
   * @param options - Runtime composition and configuration inputs.
   * @returns A configured runtime that has not been started.
   */
  build(options: IRuntimeBuilderOptions): IPlatformRuntime {
    AdapterLifecycleOrchestrator.validate(options.adapters);

    const environment =
      options.environment || process.env.NODE_ENV || 'production';

    // Build platform configuration by merging defaults,
    // config files, environment variables, and command-line arguments.
    const config = this._buildPlatformConfig(options);

    // Create a secrets redactor based on configuration to ensure
    // sensitive information is not exposed in logs or diagnostics.
    const secretsRedactor = this._createSecretsRedactor(config);

    const eventBus = new InMemoryEventBus();
    const serviceRegistry = new InMemoryServiceRegistry();
    const adminAssetCatalog = new AdminAssetCatalog();
    const platformRuntimeCatalog = new PlatformRuntimeCatalog(
      config.platform.name,
      config.platform.version,
    );

    serviceRegistry.register(
      ADMIN_ASSET_CATALOG_SERVICE_TOKEN,
      adminAssetCatalog,
    );
    serviceRegistry.register(
      PLATFORM_RUNTIME_CATALOG_SERVICE_TOKEN,
      platformRuntimeCatalog,
    );
    serviceRegistry.register(
      HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN,
      options.adapters.http.endpoints,
    );

    try {
      const configurationResult: unknown =
        options.configureServices?.(serviceRegistry);

      if (this._isThenable(configurationResult)) {
        throw new RuntimeServiceConfigurationError(
          'ASYNC_SERVICE_CONFIGURATION_NOT_SUPPORTED',
          'Runtime service configuration must complete synchronously.',
        );
      }
    } catch (error) {
      serviceRegistry.dispose();
      throw error;
    }

    const diagnosticsReporter = new DiagnosticsReporter(
      new DiagnosticReportBuilder(secretsRedactor),
    );

    const moduleContextFactory = this._createModuleContextFactory(
      environment,
      config,
      eventBus,
      serviceRegistry,
      secretsRedactor,
    );

    const moduleLifecycleOrchestrator = new ModuleLifecycleOrchestrator(
      moduleContextFactory,
      serviceRegistry.resolve(HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN),
    );

    let runtime: PlatformRuntime; // eslint-disable-line prefer-const
    const adapterLifecycleOrchestrator = new AdapterLifecycleOrchestrator(
      options.adapters,
      config,
      environment,
      serviceRegistry,
      () => runtime,
    );

    const bootstrapCoordinator = this._createBootstrapCoordinator(
      config,
      moduleLifecycleOrchestrator,
      adapterLifecycleOrchestrator,
    );

    runtime = new PlatformRuntime(
      config,
      diagnosticsReporter,
      bootstrapCoordinator,
      moduleLifecycleOrchestrator,
      serviceRegistry,
      platformRuntimeCatalog,
      adminAssetCatalog,
      {
        correlationId: options.correlationId,
        adapters: options.adapters,
        platformPersistenceDescriptor: options.platformPersistenceDescriptor,
        onStopped: () => {
          serviceRegistry.dispose();
          eventBus.dispose();
        },
      },
      adapterLifecycleOrchestrator,
    );

    return runtime;
  }

  protected _buildPlatformConfig(
    options: IRuntimeBuilderOptions,
  ): IPlatformConfig {
    const {
      configDir,
      environment = process.env.NODE_ENV || 'production',
      commandLineArgs = process.argv.slice(2),
    } = options;

    const defaultConfig: Partial<IPlatformConfig> = {
      platform: {
        name: 'Prosto Platform',
        version: pkg.version,
        basePath: process.cwd(),
        discoveryPath: './modules',
        probingPath: './app_data/modules',
        refreshProbingFolderOnStart: false,
        startupPolicy: 'strict',
      },
      modules: {
        configAccessPolicy: {
          productionStrictMode: true,
        },
      },
      adapters: {},
      security: {
        secretRedaction: {
          enabled: true,
          patterns: [
            'key',
            'token',
            'secret',
            'password',
            'passphrase',
            'url',
            'connectionString',
          ],
        },
      },
    };

    // Package defaults are always loaded first. Deployment overrides are only
    // read from an explicit configDir, never from the current working directory.
    // Resolve the installed package entry point instead of a statically-known
    // JSON URL. Vite embeds the latter as a data URL in the published bundle.
    const packageConfigDir = dirname(
      dirname(fileURLToPath(import.meta.resolve('@prosto/platform-core'))),
    );
    const deploymentConfigDir = configDir ? resolve(configDir) : undefined;
    const packagePaths = new Set([
      resolve(packageConfigDir, 'app_settings.json'),
      resolve(packageConfigDir, `app_settings.${environment}.json`),
    ]);

    const configBuilder = new ConfigurationBuilder(platformConfigSchema)
      .addInMemoryCollection(defaultConfig)
      .addJsonFile(resolve(packageConfigDir, 'app_settings.json'))
      .addJsonFile(
        resolve(packageConfigDir, `app_settings.${environment}.json`),
        { optional: true },
      );

    if (deploymentConfigDir) {
      const deploymentPaths = [
        'app_settings.json',
        `app_settings.${environment}.json`,
      ].map((fileName) => resolve(deploymentConfigDir, fileName));

      for (const filePath of deploymentPaths) {
        if (!packagePaths.has(filePath)) {
          configBuilder.addJsonFile(filePath, { optional: true });
        }
      }

      const localConfigPath = resolve(
        deploymentConfigDir,
        'app_settings.local.json',
      );

      if (!packagePaths.has(localConfigPath)) {
        configBuilder.addInMemoryCollection(
          platformLocalAdapterConfigSchema.parse(
            loadJsonFileSync(localConfigPath, true),
          ),
        );
      }
    }

    configBuilder
      .addEnvironmentVariables({ prefix: 'PROSTO_' })
      .addCommandLine(commandLineArgs);

    return configBuilder.build();
  }

  protected _createSecretsRedactor(config: IPlatformConfig): ISecretsRedactor {
    return new SecretsRedactor(config.security.secretRedaction);
  }

  private _isThenable(value: unknown): value is PromiseLike<unknown> {
    if (
      (typeof value !== 'object' || value === null) &&
      typeof value !== 'function'
    ) {
      return false;
    }

    return typeof (value as { then?: unknown }).then === 'function';
  }

  protected _createModuleContextFactory(
    environment: string,
    config: IPlatformConfig,
    eventBus: IEventBus,
    serviceRegistry: IServiceRegistry,
    secretsRedactor?: ISecretsRedactor,
  ): IModuleContextFactory {
    return new ModuleContextFactory(
      environment,
      config,
      eventBus,
      serviceRegistry,
      new ConsoleModuleLoggerFactory(secretsRedactor),
    );
  }

  protected _createBootstrapCoordinator(
    config: IPlatformConfig,
    moduleLifecycleOrchestrator: IModuleLifecycleOrchestrator,
    adapterLifecycleOrchestrator: AdapterLifecycleOrchestrator,
  ): IBootstrapCoordinator {
    const startupPolicyEvaluator = new StartupPolicyEvaluator();

    return new BootstrapCoordinator(
      BootstrapPipeline.create([
        new DiscoverStage(config.platform.discoveryPath),
        new ValidateStage([
          new ManifestValidationStrategy(),
          new CompatibilityValidationStrategy(),
        ]),
        new ResolveDependenciesStage(startupPolicyEvaluator),
        new CopyStage(
          config.platform.probingPath,
          config.platform.refreshProbingFolderOnStart,
        ),
        new LoadStage(config.platform.probingPath),
        new ModulesInitializationStage(
          startupPolicyEvaluator,
          moduleLifecycleOrchestrator,
        ),
        new PersistenceInitializationStage(adapterLifecycleOrchestrator),
        new ModulesStartStage(
          startupPolicyEvaluator,
          moduleLifecycleOrchestrator,
        ),
      ]),
    );
  }
}
