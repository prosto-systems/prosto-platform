import type { IPlatformRuntimeAdapter } from '@/platform/adapters/index.js';
import type { IHttpEndpointRegistrarProvider } from './http-endpoint-registrar.interface.js';

/** @alpha Required framework-neutral HTTP transport adapter contract. */
export interface IHttpRuntimeAdapter extends IPlatformRuntimeAdapter {
  readonly role: 'http';
  readonly endpoints: IHttpEndpointRegistrarProvider;
}
