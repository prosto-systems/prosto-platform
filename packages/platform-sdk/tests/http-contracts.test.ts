import {
  HTTP_APPLICATION_STATES,
  HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN,
  HTTP_METHODS,
  HttpEndpointRegistrationError,
  HttpRequestBodyError,
} from '@/platform/index.js';
import { describe, expect, it } from 'vitest';

describe('HTTP contracts', () => {
  it('exposes the supported endpoint methods and application states', () => {
    expect(HTTP_METHODS).toEqual([
      'DELETE',
      'GET',
      'HEAD',
      'OPTIONS',
      'PATCH',
      'POST',
      'PUT',
    ]);
    expect(HTTP_APPLICATION_STATES).toContain('listening');
  });

  it('creates typed HTTP contract errors with safe details', () => {
    const bodyError = new HttpRequestBodyError(
      'PAYLOAD_TOO_LARGE',
      'Too large',
      {
        limit: 1024,
      },
    );
    const registrationError = new HttpEndpointRegistrationError(
      'HTTP_ENDPOINT_CONFLICT',
      'Conflict',
      { method: 'GET', path: '/api/orders' },
    );

    expect(bodyError.code).toBe('PAYLOAD_TOO_LARGE');
    expect(registrationError.details).toEqual({
      method: 'GET',
      path: '/api/orders',
    });
  });

  it('exports a globally stable registrar provider token', () => {
    expect(typeof HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN).toBe(
      'symbol',
    );
    expect(Symbol.keyFor(HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN)).toBe(
      'PPS_http-endpoint-registrar-provider',
    );
  });
});
