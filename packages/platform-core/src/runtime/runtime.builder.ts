import type {
  IPlatformRuntime,
  IRuntimeBuilder,
  IRuntimeOptions,
} from './interfaces/index.js';
import {
  BootstrapCoordinator,
  BootstrapPipeline,
  DiscoverStage,
  ModuleLifecycleStage,
  ResolveDependenciesStage,
  ValidateStage,
} from '@/bootstrap/index.js';
import { FileSystemArtifactCache, NoOpArtifactCache } from '@/cache/index.js';
import { ModuleContextFactory } from '@/context/index.js';
import {
  DiagnosticsReporter,
  type IDiagnosticsReporter,
} from '@/diagnostics/index.js';
import { InMemoryEventBus } from '@/events/index.js';
import {
  type IModuleLifecycleOrchestrator,
  ModuleLifecycleOrchestrator,
} from '@/lifecycle/index.js';
import {
  ArtifactFetcher,
  ArtifactSourceFactory,
  ModuleLoader,
} from '@/loader/index.js';
import { ConsoleModuleLoggerFactory } from '@/logging/index.js';
import { StartupPolicyEvaluator } from '@/policy/index.js';
import { InMemoryServiceRegistry } from '@/services/index.js';
import {
  CompatibilityValidationStrategy,
  // IntegrityValidationStrategy,
  ManifestValidationStrategy,
} from '@/validation/index.js';
import { PlatformRuntime } from './platform-runtime.js';

/**
 * @alpha
 * Builder for creating platform runtime instances.
 * Acts as the composition root for wiring all dependencies.
 */
export class RuntimeBuilder implements IRuntimeBuilder {
  private readonly _diagnosticsReporter: IDiagnosticsReporter;
  private readonly _serviceRegistry: InMemoryServiceRegistry;
  private readonly _eventBus: InMemoryEventBus;
  private readonly _startupPolicyEvaluator: StartupPolicyEvaluator;
  private readonly _moduleLifecycleOrchestrator: IModuleLifecycleOrchestrator;

  constructor() {
    this._diagnosticsReporter = new DiagnosticsReporter();
    this._serviceRegistry = new InMemoryServiceRegistry();
    this._eventBus = new InMemoryEventBus();
    this._startupPolicyEvaluator = new StartupPolicyEvaluator();
    this._moduleLifecycleOrchestrator = new ModuleLifecycleOrchestrator(
      new ModuleContextFactory(
        new ConsoleModuleLoggerFactory(),
        this._serviceRegistry,
        this._eventBus,
      ),
    );
  }

  build(options: IRuntimeOptions): IPlatformRuntime {
    const moduleLoader = this._createModuleLoader(options);

    const bootstrapCoordinator = new BootstrapCoordinator(
      BootstrapPipeline.create([
        new DiscoverStage(moduleLoader),
        new ValidateStage([
          new ManifestValidationStrategy(),
          new CompatibilityValidationStrategy(),
          // new IntegrityValidationStrategy(),
        ]),
        new ResolveDependenciesStage(this._startupPolicyEvaluator),
        new ModuleLifecycleStage(
          this._startupPolicyEvaluator,
          this._moduleLifecycleOrchestrator,
        ),
      ]),
    );

    return new PlatformRuntime(
      options,
      this._diagnosticsReporter,
      bootstrapCoordinator,
      this._moduleLifecycleOrchestrator,
      () => {
        this._serviceRegistry.dispose();
        this._eventBus.dispose();
      },
    );
  }

  private _createModuleLoader(options: IRuntimeOptions): ModuleLoader {
    const artifactCache = !options.artifactCache
      ? new NoOpArtifactCache()
      : new FileSystemArtifactCache(
        typeof options.artifactCache === 'object'
          ? options.artifactCache
          : undefined,
      );
    const artifactSourceFactory = new ArtifactSourceFactory(new ArtifactFetcher(), artifactCache);

    return new ModuleLoader(artifactSourceFactory);
  }
}
