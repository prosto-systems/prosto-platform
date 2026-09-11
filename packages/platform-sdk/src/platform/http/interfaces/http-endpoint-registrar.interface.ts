import type { IPlatformRuntimeComponentIdentity } from '@/platform/adapters/index.js';
import type { IHttpEndpoint } from './http-endpoint.interface.js';

/** @alpha Component-scoped endpoint registration capability. */
export interface IHttpEndpointRegistrar {
  /** Registers an endpoint for the component that owns this registrar. */
  register(endpoint: IHttpEndpoint): void;
}

/**
 * @alpha
 * Host capability that creates transactional component-scoped endpoint registrars.
 *
 * Commit and rollback are synchronous and idempotent. Rollback after a commit is
 * valid and must not throw.
 */
export interface IHttpEndpointRegistrarProvider {
  createRegistrar(
    owner: IPlatformRuntimeComponentIdentity,
  ): IHttpEndpointRegistrar;
  commit(owner: IPlatformRuntimeComponentIdentity): void;
  rollback(owner: IPlatformRuntimeComponentIdentity): void;
}
