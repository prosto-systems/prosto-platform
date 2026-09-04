import {
  FASTIFY_HTTP_APPLICATION_ERROR_CODES,
  FastifyHttpApplication,
  FastifyHttpApplicationError,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

describe('Fastify adapter public API', () => {
  it('exports the HTTP application and structured lifecycle errors', () => {
    // Arrange
    const error = new FastifyHttpApplicationError(
      'FASTIFY_HTTP_APPLICATION_LISTEN_FAILED',
      'Listening failed.',
      { phase: 'listen', state: 'starting' },
      { cause: new Error('Socket unavailable.') },
    );

    // Act
    const applicationType = typeof FastifyHttpApplication;

    // Assert
    expect(applicationType).toBe('function');
    expect(FASTIFY_HTTP_APPLICATION_ERROR_CODES).toContain(error.code);
    expect(error.details).toEqual({ phase: 'listen', state: 'starting' });
    expect(error.cause).toBeInstanceOf(Error);
  });
});
