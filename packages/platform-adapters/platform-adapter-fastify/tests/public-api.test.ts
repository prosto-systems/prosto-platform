import {
  FASTIFY_HTTP_ADAPTER_ERROR_CODES,
  FastifyHttpAdapter,
  FastifyHttpAdapterError,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

describe('Fastify adapter public API', () => {
  it('exports the runtime adapter and structured lifecycle errors', () => {
    // Arrange
    const error = new FastifyHttpAdapterError(
      'FASTIFY_HTTP_ADAPTER_LISTEN_FAILED',
      'Listening failed.',
      { phase: 'listen', state: 'starting' },
      { cause: new Error('Socket unavailable.') },
    );

    // Act
    const adapterType = typeof FastifyHttpAdapter;

    // Assert
    expect(adapterType).toBe('function');
    expect(FASTIFY_HTTP_ADAPTER_ERROR_CODES).toContain(error.code);
    expect(error.details).toEqual({ phase: 'listen', state: 'starting' });
    expect(error.cause).toBeInstanceOf(Error);
  });
});
