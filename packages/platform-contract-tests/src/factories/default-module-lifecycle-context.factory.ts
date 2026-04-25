import type {
  EventHandlerType,
  EventTokenType,
  IEventBus,
  IEventEnvelope,
  IEventMetadata,
  IModuleContext,
  IPlatformModule,
  IServiceRegistry,
  ServiceTokenType,
} from '@prosto/platform-sdk';
import type { IModuleLifecycleContextFactory } from '../types/index.js';

class MockServiceRegistry implements IServiceRegistry {
  private readonly _registry = new Map<symbol, unknown>();

  register<TService>(token: ServiceTokenType<TService>, service: NoInfer<TService>): void {
    if (this._registry.has(token)) {
      throw new Error(`Service with token ${token.toString()} already registered.`);
    }

    this._registry.set(token, service);
  }

  override<TService>(token: ServiceTokenType<TService>, service: NoInfer<TService>): void {
    if (!this._registry.has(token)) {
      throw new Error(`Service with token ${token.toString()} not found.`);
    }

    this._registry.set(token, service);
  }

  resolve<TService>(token: ServiceTokenType<TService>): TService | undefined {
    return this._registry.get(token) as TService | undefined;
  }

  has<TService>(token: ServiceTokenType<TService>): boolean {
    return this._registry.has(token);
  }

  unregister<TService>(token: ServiceTokenType<TService>): void {
    this._registry.delete(token);
  }
}

class MockEventBus implements IEventBus {
  private readonly _handlers = new Map<symbol, Set<EventHandlerType<unknown>> | undefined>();

  async publish<TPayload>(
    token: EventTokenType<TPayload>,
    payload: TPayload,
    metadata?: Partial<IEventMetadata>,
  ): Promise<void> {
    const handlers = this._handlers.get(token);

    if (!handlers || !handlers.size) {
      return;
    }

    const envelope: IEventEnvelope<TPayload> = {
      payload,
      metadata: {
        timestamp: metadata?.timestamp ?? new Date().toISOString(),
        correlationId: metadata?.correlationId,
        producerModuleId: metadata?.producerModuleId,
        schemaVersion: metadata?.schemaVersion,
      },
    };

    for (const handler of Array.from(handlers)) {
      await handler(envelope);
    }
  }

  subscribe<TPayload>(token: EventTokenType<TPayload>, handler: EventHandlerType<TPayload>): void {
    const handlers = this._handlers.get(token) ?? new Set();
    handlers.add(handler as EventHandlerType<unknown>);
    this._handlers.set(token, handlers);
  }

  unsubscribe<TPayload>(token: EventTokenType<TPayload>, handler: EventHandlerType<TPayload>): void {
    const handlers = this._handlers.get(token);

    if (!handlers) {
      return;
    }

    handlers.delete(handler as EventHandlerType<unknown>);

    if (!handlers.size) {
      this._handlers.delete(token);
    }
  }
}

/**
 * @alpha
 * Default lifecycle context factory for contract execution.
 */
export class DefaultModuleLifecycleContextFactory implements IModuleLifecycleContextFactory {
  create(module: IPlatformModule): IModuleContext {
    return {
      moduleId: module.manifest.id,
      sdkVersion: module.manifest.sdkVersion,
      startupPolicy: 'best-effort',
      services: new MockServiceRegistry(),
      events: new MockEventBus(),
      getConfig: <TValue = unknown>(key: string): TValue | undefined => {
        if (key === 'contract.testing.enabled') {
          return true as TValue;
        }

        return undefined;
      },
    };
  }
}
