import { describe, expect, it, vi } from 'vitest';
import {
  HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN,
  type IHttpEndpointRegistrar,
  type IHttpEndpointRegistrarProvider,
  type IPersistenceRuntimeAdapter,
  type IPlatformModuleLogger,
  type IPlatformModuleManifest,
} from '@prosto/platform-sdk/platform';
import { InMemoryEventBus } from '@/events/index.js';
import type { IModuleLoggerFactory } from '@/logging/index.js';
import { ModuleContextFactory } from '@/modularity/index.js';
import type { IPlatformConfig } from '@/runtime/index.js';
import { InMemoryServiceRegistry } from '@/services/index.js';

const MODULE_MANIFEST: IPlatformModuleManifest = {
  id: 'module-http',
  version: '1.0.0',
  sdkVersion: '*',
  title: 'HTTP module',
  dependencies: [],
};

const PLATFORM_CONFIG: IPlatformConfig = {
  platform: {
    name: 'Test platform',
    version: '1.0.0',
    basePath: '.',
    discoveryPath: './modules',
    probingPath: './app_data/modules',
    refreshProbingFolderOnStart: false,
    startupPolicy: 'strict',
  },
  runtime: {
    shutdownTimeoutMs: 1_000,
  },
  adapters: {},
  modules: {
    configAccessPolicy: {
      productionStrictMode: true,
    },
  },
  security: {
    secretRedaction: {
      enabled: true,
      patterns: [],
    },
  },
  logging: {
    level: 'info',
    format: 'text',
  },
  custom: {},
};

const LOGGER: IPlatformModuleLogger = {
  debug: (): void => undefined,
  info: (): void => undefined,
  warn: (): void => undefined,
  error: (): void => undefined,
};

const LOGGER_FACTORY: IModuleLoggerFactory = {
  create: () => LOGGER,
};

describe('ModuleContextFactory HTTP capability', () => {
  it('creates an owner-scoped registrar during init', () => {
    // Arrange
    const services = new InMemoryServiceRegistry();
    const registrar: IHttpEndpointRegistrar = {
      register: (): void => undefined,
    };
    const createRegistrar = vi.fn((): IHttpEndpointRegistrar => registrar);
    const provider: IHttpEndpointRegistrarProvider = {
      createRegistrar,
      commit: (): void => undefined,
      rollback: (): void => undefined,
    };
    services.register(HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN, provider);
    const factory = createFactory(services);

    // Act
    const context = factory.create(createOptions('init'));

    // Assert
    expect(context.capabilities.http?.endpoints).toBe(registrar);
    expect(createRegistrar).toHaveBeenCalledOnce();
    expect(createRegistrar).toHaveBeenCalledWith({
      type: 'module',
      id: MODULE_MANIFEST.id,
    });
  });

  it.each(['start', 'stop'] as const)(
    'does not expose HTTP capability during %s',
    (lifecycleStage) => {
      // Arrange
      const services = new InMemoryServiceRegistry();
      const createRegistrar = vi.fn((): IHttpEndpointRegistrar => ({
        register: (): void => undefined,
      }));
      services.register(HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN, {
        createRegistrar,
        commit: (): void => undefined,
        rollback: (): void => undefined,
      });
      const factory = createFactory(services);

      // Act
      const context = factory.create(createOptions(lifecycleStage));

      // Assert
      expect(context.capabilities.http).toBeUndefined();
      expect(createRegistrar).not.toHaveBeenCalled();
    },
  );

  it('leaves HTTP capability undefined in a headless composition', () => {
    // Arrange
    const factory = createFactory(new InMemoryServiceRegistry());

    // Act
    const context = factory.create(createOptions('init'));

    // Assert
    expect(context.capabilities.http).toBeUndefined();
  });
});

function createFactory(
  services: InMemoryServiceRegistry,
): ModuleContextFactory {
  return new ModuleContextFactory(
    'test',
    PLATFORM_CONFIG,
    new InMemoryEventBus(),
    services,
    LOGGER_FACTORY,
  );
}

function createOptions(lifecycleStage: 'init' | 'start' | 'stop') {
  return {
    lifecycleStage,
    moduleManifest: MODULE_MANIFEST,
    startupPolicy: 'strict' as const,
    sdkVersion: '0.0.0',
    persistenceAdapter: PERSISTENCE_ADAPTER,
    persistenceState:
      lifecycleStage === 'init' ? ('collecting' as const) : ('ready' as const),
  };
}

const PERSISTENCE_ADAPTER: IPersistenceRuntimeAdapter = {
  id: 'test-persistence',
  role: 'persistence',
  descriptors: {
    registerPlatform: (): void => undefined,
    createRegistrar: () => ({ register: (): void => undefined }),
    rollback: (): void => undefined,
    seal: (): readonly [] => [],
  },
  initialize: (): void => undefined,
  start: (): void => undefined,
  stop: (): void => undefined,
};
