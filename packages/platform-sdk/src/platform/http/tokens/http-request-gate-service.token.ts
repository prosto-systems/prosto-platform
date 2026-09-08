import type { IHttpRequestGate } from '../interfaces/index.js';
import { createServiceToken } from '@/platform/services/index.js';

/** @alpha Typed token for an optional asynchronous host HTTP request gate. */
export const HTTP_REQUEST_GATE_SERVICE_TOKEN =
  createServiceToken<IHttpRequestGate>('http-request-gate');
