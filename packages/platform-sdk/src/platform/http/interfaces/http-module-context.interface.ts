import type { IHttpEndpointRegistrar } from './http-endpoint-registrar.interface.js';

/** @alpha HTTP surface exposed during a module's init lifecycle phase. */
export interface IHttpModuleContext {
  readonly endpoints: IHttpEndpointRegistrar;
}
