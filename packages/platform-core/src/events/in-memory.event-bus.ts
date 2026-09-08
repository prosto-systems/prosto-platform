import type {
  EventHandlerType,
  EventTokenType,
  IEventBus,
  IEventEnvelope,
  IEventMetadata,
} from '@prosto/platform-sdk/platform';

export class InMemoryEventBus implements IEventBus {
  readonly #handlersByToken = new Map<
    EventTokenType<unknown>,
    Set<EventHandlerType<unknown>>
  >();

  async publish<TPayload>(
    token: EventTokenType<TPayload>,
    payload: TPayload,
    metadata?: Partial<IEventMetadata>,
  ): Promise<void> {
    const handlers = this.#handlersByToken.get(token);

    if (!handlers || handlers.size === 0) {
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

    for (const handler of handlers) {
      await handler(envelope);
    }
  }

  subscribe<TPayload>(
    token: EventTokenType<TPayload>,
    handler: EventHandlerType<TPayload>,
  ): void {
    const handlers = this.#handlersByToken.get(token) ?? new Set();
    handlers.add(handler as EventHandlerType<unknown>);
    this.#handlersByToken.set(token, handlers);
  }

  unsubscribe<TPayload>(
    token: EventTokenType<TPayload>,
    handler: EventHandlerType<TPayload>,
  ): void {
    const handlers = this.#handlersByToken.get(token);

    if (!handlers) {
      return;
    }

    handlers.delete(handler as EventHandlerType<unknown>);

    if (!handlers.size) {
      this.#handlersByToken.delete(token);
    }
  }

  dispose(): void {
    this.#handlersByToken.clear();
  }
}
