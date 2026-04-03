import type {
  EventHandlerType,
  EventTokenType,
  IEventBus,
  IEventEnvelope,
  IModuleContext,
  IPlatformModule,
  IServiceRegistry,
  ServiceTokenType,
} from '@prosto/platform-sdk';
import type { IModuleLifecycleContextFactory } from '../types/index.js';

class MockServiceRegistry implements IServiceRegistry {
  private readonly _services = new Map<symbol, unknown>();

  register<TService>(token: ServiceTokenType<TService>, service: NoInfer<TService>): void {
    this._services.set(token, service);
  }

  resolve<TService>(token: ServiceTokenType<TService>): TService | undefined {
    return this._services.get(token) as TService | undefined;
  }

  has<TService>(token: ServiceTokenType<TService>): boolean {
    return this._services.has(token);
  }

  unregister<TService>(token: ServiceTokenType<TService>): void {
    this._services.delete(token);
  }
}

class MockEventBus implements IEventBus {
  private readonly _handlers = new Map<symbol, Set<EventHandlerType<unknown>> | undefined>();

  publish<TPayload>(
    token: EventTokenType<TPayload>,
    payload: TPayload,
    metadata?: Omit<IEventEnvelope<TPayload>, 'token' | 'payload' | 'timestamp'> & {
      readonly timestamp?: string;
    },
  ): void {
    const handlers = this._handlers.get(token);

    if (!handlers || !handlers.size) {
      return;
    }

    const envelope: IEventEnvelope<TPayload> = {
      token,
      payload,
      timestamp: metadata?.timestamp ?? new Date().toISOString(),
      correlationId: metadata?.correlationId,
      producerModuleId: metadata?.producerModuleId,
      schemaVersion: metadata?.schemaVersion,
    };

    for (const handler of Array.from(handlers)) {
      handler(payload, envelope);
    }
  }

  subscribe<TPayload>(token: EventTokenType<TPayload>, handler: EventHandlerType<TPayload>): void {
    const handlers = this._handlers.get(token) ?? new Set<EventHandlerType<unknown>>();
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
 * @stable
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
