import { describe, expect, it } from 'vitest';
import {
  HttpEndpointRegistrationError,
  type IHttpEndpoint,
  type IHttpEndpointRegistrar,
  type IHttpEndpointRegistrarProvider,
  type IPlatformModule,
  type IPlatformModuleContext,
  type IPlatformModuleLogger,
} from '@prosto/platform-sdk/platform';
import { RuntimeErrorCodes } from '@/common/index.js';
import { InMemoryEventBus } from '@/events/index.js';
import {
  type ICreateModuleContextOptions,
  type IModuleContextFactory,
  ModuleLifecycleOrchestrator,
  ModuleState,
  PlatformModuleEnvelope,
} from '@/modularity/index.js';
import { InMemoryServiceRegistry } from '@/services/index.js';

const ENDPOINT: IHttpEndpoint = {
  method: 'GET',
  path: '/api/items',
  handler: () => new Response(null, { status: 204 }),
};

const LOGGER: IPlatformModuleLogger = {
  debug: (): void => undefined,
  info: (): void => undefined,
  warn: (): void => undefined,
  error: (): void => undefined,
};

describe('ModuleLifecycleOrchestrator HTTP scopes', () => {
  it('commits after init and closes a retained registrar', async () => {
    // Arrange
    const events: string[] = [];
    const provider = new RecordingHttpRegistrarProvider(events);
    let retainedRegistrar: IHttpEndpointRegistrar | undefined;
    const moduleEnvelope = createModuleEnvelope({
      init(context) {
        events.push('module:init');
        retainedRegistrar = context.capabilities.http?.endpoints;
        retainedRegistrar?.register(ENDPOINT);
      },
      start: (): void => undefined,
      stop: (): void => undefined,
    });
    const orchestrator = createOrchestrator(provider);

    // Act
    const result = await orchestrator.initializeModules(
      [moduleEnvelope],
      STARTUP_OPTIONS,
    );

    // Assert
    expect(result.initializedModules).toEqual([moduleEnvelope]);
    expect(result.issues).toEqual([]);
    expect(moduleEnvelope.state).toBe(ModuleState.Initialized);
    expect(events).toEqual(['module:init', 'provider:commit']);
    expect(provider.endpointCount(moduleEnvelope.id)).toBe(1);
    expect(() => retainedRegistrar?.register(ENDPOINT)).toThrowError(
      expect.objectContaining({ code: 'REGISTRATION_SCOPE_CLOSED' }),
    );
  });

  it('rolls back declarations when init fails', async () => {
    // Arrange
    const provider = new RecordingHttpRegistrarProvider();
    const moduleEnvelope = createModuleEnvelope({
      init(context) {
        context.capabilities.http?.endpoints.register(ENDPOINT);
        throw new Error('init failed');
      },
      start: (): void => undefined,
      stop: (): void => undefined,
    });
    const orchestrator = createOrchestrator(provider);

    // Act
    const result = await orchestrator.initializeModules(
      [moduleEnvelope],
      STARTUP_OPTIONS,
    );

    // Assert
    expect(result.initializedModules).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        lifecycleStage: 'init',
        errorCode: RuntimeErrorCodes.LifecycleInitFailed,
      }),
    ]);
    expect(provider.rollbackCalls).toEqual([moduleEnvelope.id]);
    expect(provider.endpointCount(moduleEnvelope.id)).toBe(0);
  });

  it('treats commit failure as init failure and preserves safe HTTP diagnostics', async () => {
    // Arrange
    const provider = new RecordingHttpRegistrarProvider();
    provider.commitError = new HttpEndpointRegistrationError(
      'HTTP_ENDPOINT_CONFLICT',
      'The endpoint conflicts with an existing declaration.',
      {
        remediationHint: 'Change the endpoint method or path.',
      },
    );
    const moduleEnvelope = createModuleEnvelope({
      init(context) {
        context.capabilities.http?.endpoints.register(ENDPOINT);
      },
      start: (): void => undefined,
      stop: (): void => undefined,
    });
    const orchestrator = createOrchestrator(provider);

    // Act
    const result = await orchestrator.initializeModules(
      [moduleEnvelope],
      STARTUP_OPTIONS,
    );

    // Assert
    expect(result.initializedModules).toEqual([]);
    expect(moduleEnvelope.state).toBe(ModuleState.NotInitialized);
    expect(provider.commitCalls).toEqual([moduleEnvelope.id]);
    expect(provider.rollbackCalls).toEqual([moduleEnvelope.id]);
    expect(provider.endpointCount(moduleEnvelope.id)).toBe(0);
    expect(result.issues).toEqual([
      {
        moduleId: moduleEnvelope.id,
        phase: 'lifecycle',
        lifecycleStage: 'init',
        errorCode: RuntimeErrorCodes.HttpEndpointRegistrationFailed,
        message: 'The endpoint conflicts with an existing declaration.',
        remediationHint: 'Change the endpoint method or path.',
      },
    ]);
  });

  it('rolls back committed declarations when start fails', async () => {
    // Arrange
    const provider = new RecordingHttpRegistrarProvider();
    const moduleEnvelope = createModuleEnvelope({
      init(context) {
        context.capabilities.http?.endpoints.register(ENDPOINT);
      },
      start() {
        throw new Error('start failed');
      },
      stop: (): void => undefined,
    });
    const orchestrator = createOrchestrator(provider);
    const initialization = await orchestrator.initializeModules(
      [moduleEnvelope],
      STARTUP_OPTIONS,
    );

    // Act
    const result = await orchestrator.startModules(
      initialization.initializedModules,
      STARTUP_OPTIONS,
    );

    // Assert
    expect(result.startedModules).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        lifecycleStage: 'start',
        errorCode: RuntimeErrorCodes.LifecycleStartFailed,
      }),
    ]);
    expect(moduleEnvelope.state).toBe(ModuleState.NotStarted);
    expect(provider.rollbackCalls).toEqual([moduleEnvelope.id]);
    expect(provider.endpointCount(moduleEnvelope.id)).toBe(0);
  });

  it('runs lifecycle without HTTP scope operations in a headless composition', async () => {
    // Arrange
    const moduleEnvelope = createModuleEnvelope({
      init(context) {
        expect(context.capabilities.http).toBeUndefined();
      },
      start(context) {
        expect(context.capabilities.http).toBeUndefined();
      },
      stop: (): void => undefined,
    });
    const orchestrator = createOrchestrator();

    // Act
    const initialization = await orchestrator.initializeModules(
      [moduleEnvelope],
      STARTUP_OPTIONS,
    );
    const startup = await orchestrator.startModules(
      initialization.initializedModules,
      STARTUP_OPTIONS,
    );

    // Assert
    expect(initialization.issues).toEqual([]);
    expect(startup.issues).toEqual([]);
    expect(startup.startedModules).toEqual([moduleEnvelope]);
  });
});

const STARTUP_OPTIONS = {
  startupPolicy: 'strict' as const,
  sdkVersion: '0.0.0',
  persistenceEnabled: false,
};

type ScopeStateType = 'open' | 'committed' | 'rolled-back';

interface ITestScope {
  state: ScopeStateType;
  endpoints: IHttpEndpoint[];
}

class RecordingHttpRegistrarProvider implements IHttpEndpointRegistrarProvider {
  readonly commitCalls: string[] = [];
  readonly rollbackCalls: string[] = [];
  commitError: unknown;

  readonly #scopes = new Map<string, ITestScope>();

  constructor(private readonly _events: string[] = []) {}

  createRegistrar(moduleId: string): IHttpEndpointRegistrar {
    const scope: ITestScope = {
      state: 'open',
      endpoints: [],
    };
    this.#scopes.set(moduleId, scope);

    return {
      register: (endpoint): void => {
        if (scope.state !== 'open') {
          throw new HttpEndpointRegistrationError(
            'REGISTRATION_SCOPE_CLOSED',
            `Registration scope for module "${moduleId}" is closed.`,
            { ownerId: moduleId },
          );
        }

        scope.endpoints.push(endpoint);
      },
    };
  }

  commit(moduleId: string): void {
    this.commitCalls.push(moduleId);
    this._events.push('provider:commit');

    if (this.commitError) {
      throw this.commitError;
    }

    const scope = this.#scopes.get(moduleId);
    if (scope) {
      scope.state = 'committed';
    }
  }

  rollback(moduleId: string): void {
    this.rollbackCalls.push(moduleId);
    const scope = this.#scopes.get(moduleId);

    if (scope) {
      scope.state = 'rolled-back';
      scope.endpoints.length = 0;
    }
  }

  endpointCount(moduleId: string): number {
    return this.#scopes.get(moduleId)?.endpoints.length ?? 0;
  }
}

function createOrchestrator(
  provider?: IHttpEndpointRegistrarProvider,
): ModuleLifecycleOrchestrator {
  return new ModuleLifecycleOrchestrator(
    createContextFactory(provider),
    provider,
  );
}

function createContextFactory(
  provider?: IHttpEndpointRegistrarProvider,
): IModuleContextFactory {
  const eventBus = new InMemoryEventBus();
  const services = new InMemoryServiceRegistry();

  return {
    create(options: ICreateModuleContextOptions): IPlatformModuleContext {
      const http =
        options.lifecycleStage === 'init' && provider
          ? {
              endpoints: provider.createRegistrar(options.moduleManifest.id),
            }
          : undefined;

      return {
        moduleId: options.moduleManifest.id,
        environment: 'test',
        startupPolicy: options.startupPolicy,
        sdkVersion: options.sdkVersion,
        eventBus,
        services,
        capabilities: { http },
        logger: LOGGER,
        config: {},
        getConfigValue<T>(_key: string, defaultValue?: T): Readonly<T> {
          return defaultValue as T;
        },
      };
    },
  };
}

function createModuleEnvelope(
  moduleInstance: IPlatformModule,
): PlatformModuleEnvelope {
  const moduleEnvelope = new PlatformModuleEnvelope({
    id: 'module-http',
    version: '1.0.0',
    sdkVersion: '*',
    title: 'HTTP module',
    dependencies: [],
  });
  moduleEnvelope.moduleInstance = moduleInstance;

  return moduleEnvelope;
}
