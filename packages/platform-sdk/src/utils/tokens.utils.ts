import type {
  EventTokenType,
  ServiceTokenType,
  TokenNameType,
} from '@/types/index.js';
import {
  EVENT_TOKEN_NAME_PREFIX,
  SERVICE_TOKEN_NAME_PREFIX,
} from '@/constants/index.js';

function normalizeTokenName(name: TokenNameType): string {
  const normalized = name.trim();

  if (!normalized.length) {
    throw new TypeError('Token name must be a non-empty string.');
  }

  return normalized;
}

/**
 * @alpha
 * Returns the canonical key used to create a service token.
 */
export function getServiceTokenKey(name: TokenNameType): string {
  return `${SERVICE_TOKEN_NAME_PREFIX}${normalizeTokenName(name)}`;
}

/**
 * @alpha
 * Returns the canonical key used to create an event token.
 */
export function getEventTokenKey(name: TokenNameType): string {
  return `${EVENT_TOKEN_NAME_PREFIX}${normalizeTokenName(name)}`;
}

/**
 * @alpha
 * Creates a globally stable, typed service token.
 */
export function createServiceToken<TService>(
  name: TokenNameType,
): ServiceTokenType<TService> {
  return Symbol.for(getServiceTokenKey(name)) as ServiceTokenType<TService>;
}

/**
 * @alpha
 * Creates a globally stable, typed event token.
 */
export function createEventToken<TPayload>(
  name: TokenNameType,
): EventTokenType<TPayload> {
  return Symbol.for(getEventTokenKey(name)) as EventTokenType<TPayload>;
}
