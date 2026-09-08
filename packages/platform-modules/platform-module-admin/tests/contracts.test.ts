import type {
  IPlatformModuleContext,
  IPlatformModuleManifest,
  IServiceRegistry,
  ServiceTokenType,
} from '@prosto/platform-sdk/platform';
import type { IModuleLifecycleContextFactory } from '@prosto/platform-contract-tests';
import { createPlatformModuleContractTests } from '@prosto/platform-contract-tests';
import type { DataSource } from 'typeorm';
import { describe, it } from 'vitest';
import { TYPEORM_DATA_SOURCE_SERVICE_TOKEN } from '@prosto/platform-adapter-typeorm';
import manifest from '../manifest.json';
import { PlatformAdminModule } from '@/platform/platform.module.js';

class TestServiceRegistry implements IServiceRegistry {
  private readonly _values = new Map<symbol, unknown>();

  has<TService>(token: ServiceTokenType<TService>): boolean {
    return this._values.has(token);
  }

  register<TService>(
    token: ServiceTokenType<TService>,
    service: NoInfer<TService>,
  ): void {
    this._values.set(token, service);
  }

  override<TService>(
    token: ServiceTokenType<TService>,
    service: NoInfer<TService>,
  ): void {
    this._values.set(token, service);
  }

  resolve<TService>(token: ServiceTokenType<TService>): TService | undefined {
    return this._values.get(token) as TService | undefined;
  }

  resolveRequired<TService>(token: ServiceTokenType<TService>): TService {
    const value = this.resolve(token);

    if (value === undefined) {
      throw new Error('Test service is unavailable.');
    }

    return value;
  }

  unregister<TService>(token: ServiceTokenType<TService>): void {
    this._values.delete(token);
  }
}

class PlatformAdminContractContextFactory implements IModuleLifecycleContextFactory {
  private readonly _services = new TestServiceRegistry();

  constructor() {
    const existingState = {
      id: 'platform-admin-state',
      maintenanceEnabled: false,
      restartGeneration: 0,
      updatedAt: new Date().toISOString(),
    };
    const repository = {
      count: async (): Promise<number> => 1,
      findOneBy: async (): Promise<typeof existingState> => existingState,
    };
    const dataSource = {
      getRepository: (): typeof repository => repository,
    } as unknown as DataSource;

    this._services.register(TYPEORM_DATA_SOURCE_SERVICE_TOKEN, dataSource);
  }

  create(moduleManifest: IPlatformModuleManifest): IPlatformModuleContext {
    const configuration = {
      allowedPublicOrigin: 'https://admin.example.test',
      cookie: { lifetimeSeconds: 3_600, name: 'admin_session', secure: true },
      outbox: { leaseSeconds: 30, maxAttempts: 3, retryBaseSeconds: 1 },
      rateLimit: {
        login: { maxAttempts: 5, windowSeconds: 60 },
        passwordReset: { maxAttempts: 5, windowSeconds: 60 },
      },
      resetTokenEncryptionKey: Buffer.alloc(32).toString('base64url'),
      resetUrlBase: 'https://admin.example.test/password-reset',
      restartPollingIntervalSeconds: 60,
      smtp: {
        from: 'noreply@example.test',
        host: 'smtp.example.test',
        port: 465,
        secure: true,
      },
    };

    return {
      capabilities: {
        http: {
          endpoints: {
            register: (): void => undefined,
          },
        },
        persistence: {
          descriptors: {
            register: (): void => undefined,
            rollback: (): void => undefined,
            seal: () => [],
          },
          state: 'collecting',
        },
      },
      config: { modules: { 'platform-admin': configuration } },
      environment: 'test',
      eventBus: {},
      getConfigValue: <T>(key: string): Readonly<T> =>
        (key === 'modules.platform-admin' ? configuration : undefined) as T,
      logger: {
        debug: (): void => undefined,
        error: (): void => undefined,
        info: (): void => undefined,
        warn: (): void => undefined,
      },
      moduleId: moduleManifest.id,
      sdkVersion: moduleManifest.sdkVersion,
      services: this._services,
      startupPolicy: 'best-effort',
    } as unknown as IPlatformModuleContext;
  }
}

describe('PlatformAdminModule contract', () => {
  createPlatformModuleContractTests(
    {
      manifest,
      module: new PlatformAdminModule(),
      moduleLifecycleContextFactory: new PlatformAdminContractContextFactory(),
    },
    { describe, it },
  );
});
