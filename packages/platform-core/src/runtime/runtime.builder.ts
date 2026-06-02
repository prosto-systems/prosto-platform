import pkg from '../../package.json' with { type: 'json' };
import type { IEventBus, IServiceRegistry } from '@prosto/platform-sdk';
import type {
  IPlatformConfig,
  IPlatformRuntime,
  IRuntimeBuilder,
  IRuntimeBuilderOptions,
} from './interfaces/index.js';
import { resolve } from 'node:path';
import {
  BootstrapCoordinator,
  BootstrapPipeline,
  DiscoverStage,
  type IBootstrapCoordinator,
  ModuleLifecycleStage,
  ResolveDependenciesStage,
  ValidateStage,
} from '@/bootstrap/index.js';
import { FileSystemArtifactCache, NoOpArtifactCache } from '@/caching/index.js';
import { ConfigurationBuilder } from '@/common/index.js';
import {
  DiagnosticReportBuilder,
  DiagnosticsReporter,
} from '@/diagnostics/index.js';
import { InMemoryEventBus } from '@/events/index.js';
import { ConsoleModuleLoggerFactory } from '@/logging/index.js';
import {
  ArtifactFetcher,
  ArtifactSourceFactory,
  CompatibilityValidationStrategy,
  ConfigAccessValidationStrategy,
  type IModuleContextFactory,
  type IModuleLifecycleOrchestrator,
  type IModuleLoader,
  IntegrityValidationStrategy,
  ManifestValidationStrategy,
  ModuleContextFactory,
  ModuleLifecycleOrchestrator,
  ModuleLoader,
  StartupPolicyEvaluator,
} from '@/modularity/index.js';
import { type ISecretsRedactor, SecretsRedactor } from '@/security/index.js';
import { InMemoryServiceRegistry } from '@/services/index.js';
import { PlatformRuntime } from './platform-runtime.js';
import { platformConfigSchema } from './schemas/index.js';

/**
 * @alpha
 * Builder for creating platform runtime instances.
 * Acts as the composition root for wiring all dependencies.
 */
export class RuntimeBuilder implements IRuntimeBuilder {
  build(options: IRuntimeBuilderOptions): IPlatformRuntime {
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
    );

    const bootstrapCoordinator = this._createBootstrapCoordinator(
      environment,
      config,
      moduleLifecycleOrchestrator,
    );

    return new PlatformRuntime(
      options.modules,
      config,
      diagnosticsReporter,
      bootstrapCoordinator,
      moduleLifecycleOrchestrator,
      {
        correlationId: options.correlationId,
        onStopped: () => {
          serviceRegistry.dispose();
          eventBus.dispose();
        },
      },
    );
  }

  protected _buildPlatformConfig(
    options: IRuntimeBuilderOptions,
  ): IPlatformConfig {
    const {
      configDir = '.',
      environment = process.env.NODE_ENV || 'production',
      commandLineArgs = process.argv.slice(2),
    } = options;

    const defaultConfig: Partial<IPlatformConfig> = {
      platform: {
        name: 'Prosto Platform',
        version: pkg.version,
        basePath: process.cwd(),
        startupPolicy: 'strict',
      },
      modules: {
        configAccessPolicy: {
          sectionAllowlistBySecurityClass: {
            trusted: [
              'platform',
              'runtime',
              'modules',
              'security',
              'logging',
              'custom',
            ],
            internal: ['platform', 'runtime', 'security', 'logging', 'custom'],
            'third-party-reviewed': ['platform', 'logging', 'custom'],
          },
          productionStrictMode: true,
          denyOnUnknownCapability: true,
        },
        artifactCache: {
          enabled: false,
        },
      },
      security: {
        secretRedaction: {
          enabled: true,
          patterns: ['key', 'token', 'secret', 'password', 'passphrase'],
        },
      },
    };

    const configBuilder = new ConfigurationBuilder(platformConfigSchema)
      .addInMemoryCollection(defaultConfig)
      .addJsonFile(`${configDir}/app_settings.json`, { optional: true })
      .addJsonFile(`${configDir}/app_settings.${environment}.json`, {
        optional: true,
      })
      .addEnvironmentVariables({ prefix: 'PROSTO_' })
      .addCommandLine(commandLineArgs);

    return configBuilder.build();
  }

  protected _createSecretsRedactor(config: IPlatformConfig): ISecretsRedactor {
    return new SecretsRedactor(config.security.secretRedaction);
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
    environment: string,
    config: IPlatformConfig,
    moduleLifecycleOrchestrator: IModuleLifecycleOrchestrator,
  ): IBootstrapCoordinator {
    const isProductionEnvironment = environment === 'production';
    const moduleLoader = this._createModuleLoader(config);
    const startupPolicyEvaluator = new StartupPolicyEvaluator();

    return new BootstrapCoordinator(
      BootstrapPipeline.create([
        new DiscoverStage(moduleLoader),
        new ValidateStage([
          new ManifestValidationStrategy(),
          new IntegrityValidationStrategy(),
          new CompatibilityValidationStrategy(),
          new ConfigAccessValidationStrategy(config, isProductionEnvironment),
        ]),
        new ResolveDependenciesStage(startupPolicyEvaluator),
        new ModuleLifecycleStage(
          startupPolicyEvaluator,
          moduleLifecycleOrchestrator,
        ),
      ]),
    );
  }

  protected _createModuleLoader(config: IPlatformConfig): IModuleLoader {
    const { artifactCache: artifactCacheConfig } = config.modules;

    const artifactCache = artifactCacheConfig.enabled
      ? new FileSystemArtifactCache({
          maxAgeMs: artifactCacheConfig.maxAgeMs,
          maxSizeBytes: artifactCacheConfig.maxSizeBytes,
          path: resolve(
            config.platform.basePath,
            artifactCacheConfig.path || '.cache/module-artifacts',
          ),
        })
      : new NoOpArtifactCache();

    return new ModuleLoader(
      new ArtifactSourceFactory(new ArtifactFetcher(), artifactCache),
    );
  }
}
