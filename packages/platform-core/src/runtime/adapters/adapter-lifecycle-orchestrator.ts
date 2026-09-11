import {
  type IPlatformRuntimeAdapter,
  type IPlatformRuntimeAdapterDiagnostic,
  type IPlatformRuntimeAdapterLogger,
  type IPlatformRuntimeComponentIdentity,
  type IServiceRegistry,
  PLATFORM_ADMIN_COMPONENT_ID,
  type PlatformRuntimeAdapterLifecycleStageType,
  type ServiceTokenType,
} from '@prosto/platform-sdk/platform';
import { ConsoleModuleLoggerFactory } from '@/logging/index.js';
import type { IPlatformConfig } from '../interfaces/platform-config.interface.js';
import type { IRequiredRuntimeAdapters } from '../interfaces/runtime-builder-options.interface.js';
import {
  RuntimeAdapterCompositionError,
  RuntimeAdapterLifecycleError,
} from '../errors/index.js';

/** @internal Coordinates required adapter barriers and their rollback. */
export class AdapterLifecycleOrchestrator {
  readonly #initialized = new Set<IPlatformRuntimeAdapter>();
  readonly #started = new Set<IPlatformRuntimeAdapter>();
  readonly #registeredServiceTokens = new Map<
    IPlatformRuntimeAdapter,
    Set<ServiceTokenType<unknown>>
  >();
  readonly #diagnostics: IPlatformRuntimeAdapterDiagnostic[] = [];
  #startupFailure: RuntimeAdapterLifecycleError | undefined;

  constructor(
    private readonly _adapters: IRequiredRuntimeAdapters,
    private readonly _config: IPlatformConfig,
    private readonly _environment: string,
    private readonly _services: IServiceRegistry,
    private readonly _runtime: () => {
      readonly started: boolean;
      readonly stopping: boolean;
      readonly stopped: boolean;
      readonly degraded: boolean;
      readonly startedModuleIds: readonly string[];
    },
  ) {}

  get diagnostics(): readonly IPlatformRuntimeAdapterDiagnostic[] {
    return [...this.#diagnostics];
  }

  get startupFailure(): RuntimeAdapterLifecycleError | undefined {
    return this.#startupFailure;
  }

  static validate(
    adapters: unknown,
  ): asserts adapters is IRequiredRuntimeAdapters {
    if (typeof adapters !== 'object' || adapters === null) {
      throw new RuntimeAdapterCompositionError(
        'MISSING_ADAPTERS',
        'RuntimeBuilder requires admin, persistence, and http adapters.',
      );
    }

    const candidate = adapters as Partial<IRequiredRuntimeAdapters>;
    const expected = [
      ['admin', candidate.admin, 'admin'],
      ['persistence', candidate.persistence, 'persistence'],
      ['http', candidate.http, 'http'],
    ] as const;
    const ids = new Set<string>();
    const instances = new Set<IPlatformRuntimeAdapter>();

    for (const [key, adapter, role] of expected) {
      if (!adapter || typeof adapter !== 'object') {
        throw new RuntimeAdapterCompositionError(
          'INVALID_ADAPTER',
          `Runtime adapter "${key}" must implement the ${role} lifecycle contract.`,
        );
      }

      if (instances.has(adapter)) {
        throw new RuntimeAdapterCompositionError(
          'REUSED_ADAPTER_INSTANCE',
          `Runtime adapter "${adapter.id}" cannot satisfy multiple roles.`,
        );
      }

      if (
        typeof adapter.id !== 'string' ||
        !adapter.id.trim() ||
        typeof adapter.initialize !== 'function' ||
        typeof adapter.start !== 'function' ||
        typeof adapter.stop !== 'function'
      ) {
        throw new RuntimeAdapterCompositionError(
          'INVALID_ADAPTER',
          `Runtime adapter "${key}" must implement the ${role} lifecycle contract.`,
        );
      }

      if (adapter.role !== role) {
        throw new RuntimeAdapterCompositionError(
          'MISMATCHED_ADAPTER_ROLE',
          `Runtime adapter "${key}" must have the ${role} role.`,
        );
      }

      if (ids.has(adapter.id)) {
        throw new RuntimeAdapterCompositionError(
          'DUPLICATE_ADAPTER_ID',
          `Runtime adapter ID "${adapter.id}" is duplicated.`,
        );
      }

      instances.add(adapter);
      ids.add(adapter.id);
    }

    if (candidate.admin?.id !== PLATFORM_ADMIN_COMPONENT_ID) {
      throw new RuntimeAdapterCompositionError(
        'MISMATCHED_ADMIN_ID',
        `The admin adapter ID must be "${PLATFORM_ADMIN_COMPONENT_ID}".`,
      );
    }

    if (
      !AdapterLifecycleOrchestrator.#hasCallableMembers(
        candidate.persistence?.descriptors,
        ['registerPlatform', 'createRegistrar', 'rollback', 'seal'],
      )
    ) {
      throw new RuntimeAdapterCompositionError(
        'INVALID_ADAPTER',
        'The persistence adapter must expose its descriptor registry.',
      );
    }

    if (
      !AdapterLifecycleOrchestrator.#hasCallableMembers(
        candidate.http?.endpoints,
        ['createRegistrar', 'commit', 'rollback'],
      )
    ) {
      throw new RuntimeAdapterCompositionError(
        'INVALID_ADAPTER',
        'The HTTP adapter must expose its endpoint registrar.',
      );
    }
  }

  async initializeAll(): Promise<void> {
    this.#assertConfigurationPlacement();
    await this.#initialize(this._adapters.persistence);
    await this.#initialize(this._adapters.http);
    await this.#initialize(this._adapters.admin);
  }

  async startPersistence(): Promise<void> {
    await this.#start(this._adapters.persistence);
  }

  async startAdmin(): Promise<void> {
    await this.#start(this._adapters.admin);
  }

  async startHttp(): Promise<void> {
    await this.#start(this._adapters.http);
  }

  async stopHttp(): Promise<void> {
    await this.#stop(this._adapters.http);
  }

  async stopAdmin(): Promise<void> {
    await this.#stop(this._adapters.admin);
  }

  async stopPersistence(): Promise<void> {
    await this.#stop(this._adapters.persistence);
  }

  async #initialize(adapter: IPlatformRuntimeAdapter): Promise<void> {
    const identity = this.#identity(adapter);
    let persistenceRegistrarCreated = false;
    let httpRegistrarCreated = false;

    try {
      const persistence =
        this._adapters.persistence.descriptors.createRegistrar(identity);

      persistenceRegistrarCreated = true;

      const http = this._adapters.http.endpoints.createRegistrar(identity);

      httpRegistrarCreated = true;

      this.#assertRegistrar(persistence);
      this.#assertRegistrar(http);

      const contributions = {
        services: this.#createServiceRegistrar(adapter),
        persistence,
        http,
      };

      await adapter.initialize({
        ...this.#baseContext(adapter),
        contributions,
      });
      this.#initialized.add(adapter);
      this.#record(adapter, 'initialize', 'succeeded');
    } catch {
      if (persistenceRegistrarCreated) {
        this._adapters.persistence.descriptors.rollback(identity);
      }

      if (httpRegistrarCreated) {
        this._adapters.http.endpoints.rollback(identity);
      }

      this.#unregisterServices(adapter);
      this.#record(adapter, 'initialize', 'failed');

      const failure = new RuntimeAdapterLifecycleError(
        adapter.id,
        'initialize',
      );
      this.#startupFailure ??= failure;
      throw failure;
    }
  }

  async #start(adapter: IPlatformRuntimeAdapter): Promise<void> {
    try {
      await adapter.start({
        ...this.#baseContext(adapter),
        runtime: this._runtime(),
      });
      this.#started.add(adapter);
      this._adapters.http.endpoints.commit(this.#identity(adapter));
      this.#record(adapter, 'start', 'succeeded');
    } catch {
      this._adapters.http.endpoints.rollback(this.#identity(adapter));
      this.#unregisterServices(adapter);
      this.#record(adapter, 'start', 'failed');
      const failure = new RuntimeAdapterLifecycleError(adapter.id, 'start');
      this.#startupFailure ??= failure;
      throw failure;
    }
  }

  async #stop(adapter: IPlatformRuntimeAdapter): Promise<void> {
    if (!this.#initialized.has(adapter)) return;

    try {
      await adapter.stop({
        ...this.#baseContext(adapter),
        runtime: this._runtime(),
      });
      this.#record(adapter, 'stop', 'succeeded');
    } catch {
      this.#record(adapter, 'stop', 'failed');
      throw new RuntimeAdapterLifecycleError(adapter.id, 'stop');
    } finally {
      this._adapters.http.endpoints.rollback(this.#identity(adapter));
      this.#unregisterServices(adapter);
      this.#started.delete(adapter);
      this.#initialized.delete(adapter);
    }
  }

  #baseContext(adapter: IPlatformRuntimeAdapter): {
    readonly identity: IPlatformRuntimeComponentIdentity;
    readonly environment: string;
    readonly config: Readonly<Record<string, unknown>>;
    readonly logger: IPlatformRuntimeAdapterLogger;
  } {
    const logger = new ConsoleModuleLoggerFactory().create({
      moduleId: adapter.id,
    });
    return {
      identity: this.#identity(adapter),
      environment: this._environment,
      config: this.#getScopedConfig(adapter.id),
      logger,
    };
  }

  #createServiceRegistrar(adapter: IPlatformRuntimeAdapter): {
    register<TService>(
      token: ServiceTokenType<TService>,
      service: NoInfer<TService>,
    ): void;
    unregister<TService>(token: ServiceTokenType<TService>): void;
    resolve<TService>(token: ServiceTokenType<TService>): TService | undefined;
    resolveRequired<TService>(token: ServiceTokenType<TService>): TService;
    has<TService>(token: ServiceTokenType<TService>): boolean;
  } {
    return {
      register: <TService>(
        token: ServiceTokenType<TService>,
        service: NoInfer<TService>,
      ): void => {
        this._services.register(token, service);
        const tokens = this.#registeredServiceTokens.get(adapter) ?? new Set();
        tokens.add(token as ServiceTokenType<unknown>);
        this.#registeredServiceTokens.set(adapter, tokens);
      },
      unregister: <TService>(token: ServiceTokenType<TService>): void => {
        const tokens = this.#registeredServiceTokens.get(adapter);

        if (!tokens?.delete(token as ServiceTokenType<unknown>)) return;

        this._services.unregister(token);

        if (tokens.size === 0) {
          this.#registeredServiceTokens.delete(adapter);
        }
      },
      resolve: <TService>(
        token: ServiceTokenType<TService>,
      ): TService | undefined => this._services.resolve(token),
      resolveRequired: <TService>(
        token: ServiceTokenType<TService>,
      ): TService => this._services.resolveRequired(token),
      has: <TService>(token: ServiceTokenType<TService>): boolean =>
        this._services.has(token),
    };
  }

  #unregisterServices(adapter: IPlatformRuntimeAdapter): void {
    for (const token of this.#registeredServiceTokens.get(adapter) ?? []) {
      this._services.unregister(token);
    }
    this.#registeredServiceTokens.delete(adapter);
  }

  #identity(
    adapter: IPlatformRuntimeAdapter,
  ): IPlatformRuntimeComponentIdentity {
    return { type: 'adapter', id: adapter.id };
  }

  #getScopedConfig(adapterId: string): Readonly<Record<string, unknown>> {
    const value = this._config.adapters[adapterId];
    return this.#freeze(value && typeof value === 'object' ? { ...value } : {});
  }

  #freeze(value: Record<string, unknown>): Readonly<Record<string, unknown>> {
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object' && !Object.isFrozen(child)) {
        this.#freeze(child as Record<string, unknown>);
      }
    }
    return Object.freeze(value);
  }

  static #hasCallableMembers(
    value: unknown,
    members: readonly string[],
  ): value is Record<string, (...args: never[]) => unknown> {
    if (!value || typeof value !== 'object') return false;

    return members.every(
      (member) =>
        member in value &&
        typeof (value as Record<string, unknown>)[member] === 'function',
    );
  }

  #assertRegistrar(registrar: unknown): void {
    if (
      !AdapterLifecycleOrchestrator.#hasCallableMembers(registrar, ['register'])
    ) {
      throw new TypeError('Adapter registrar must expose register().');
    }
  }

  #assertConfigurationPlacement(): void {
    for (const adapter of Object.values(this._adapters)) {
      if (Object.hasOwn(this._config.modules, adapter.id)) {
        throw new RuntimeAdapterCompositionError(
          'MISPLACED_ADAPTER_CONFIGURATION',
          `Configuration for adapter "${adapter.id}" must be under adapters.${adapter.id}.`,
        );
      }
    }
  }

  #record(
    adapter: IPlatformRuntimeAdapter,
    stage: PlatformRuntimeAdapterLifecycleStageType,
    status: 'succeeded' | 'failed',
  ): void {
    this.#diagnostics.push({
      adapter: this.#identity(adapter),
      role: adapter.role,
      stage,
      status,
      ...(status === 'failed'
        ? {
            code: 'ADAPTER_LIFECYCLE_FAILED',
            message: `Adapter ${stage} failed.`,
          }
        : {}),
    });
  }
}
