import type { EventTokenType } from '../types/index.js';

/**
 * @stable
 * Metadata envelope attached to module events.
 */
export interface IEventEnvelope<TPayload> {
  readonly token: EventTokenType<TPayload>;
  readonly payload: TPayload;
  readonly timestamp: string;
  readonly correlationId?: string;
  readonly producerModuleId?: string;
  readonly schemaVersion?: string;
}

/**
 * @stable
 * Event handler callback signature.
 */
export type EventHandlerType<TPayload> = (
  payload: TPayload,
  envelope: IEventEnvelope<TPayload>,
) => void | Promise<void>;

/**
 * @stable
 * Typed event bus contract shared by modules and runtime.
 */
export interface IEventBus {
  publish<TPayload>(
    token: EventTokenType<TPayload>,
    payload: TPayload,
    metadata?: Omit<IEventEnvelope<TPayload>, 'token' | 'payload' | 'timestamp'> & {
      readonly timestamp?: string;
    },
  ): void | Promise<void>;
  subscribe<TPayload>(token: EventTokenType<TPayload>, handler: EventHandlerType<TPayload>): void;
  unsubscribe<TPayload>(token: EventTokenType<TPayload>, handler: EventHandlerType<TPayload>): void;
}
