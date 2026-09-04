import type { IHttpEndpointRegistrarProvider } from '../interfaces/index.js';
import { createServiceToken } from '@/platform/services/index.js';

/** @alpha Stable service token for the host HTTP endpoint registrar provider. */
export const HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN =
  createServiceToken<IHttpEndpointRegistrarProvider>(
    'http-endpoint-registrar-provider',
  );
