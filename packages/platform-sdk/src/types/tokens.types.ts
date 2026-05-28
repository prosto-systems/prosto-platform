declare const SERVICE_TOKEN_BRAND: unique symbol;
declare const EVENT_TOKEN_BRAND: unique symbol;

/**
 * @alpha
 * Logical token name used to derive stable symbols.
 */
export type TokenNameType = string;

/**
 * @alpha
 * Typed symbol identity for service registry entries.
 */
export type ServiceTokenType<TService> = symbol & {
  readonly [SERVICE_TOKEN_BRAND]: TService;
};

/**
 * @alpha
 * Typed symbol identity for event bus channels.
 */
export type EventTokenType<TPayload> = symbol & {
  readonly [EVENT_TOKEN_BRAND]: TPayload;
};
