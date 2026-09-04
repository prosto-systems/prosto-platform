import type { IHttpEndpoint } from './http-endpoint.interface.js';

/** @alpha Module-scoped endpoint registration capability. */
export interface IHttpEndpointRegistrar {
  /** Registers an endpoint for the module that owns this registrar. */
  register(endpoint: IHttpEndpoint): void;
}

/**
 * @alpha
 * Host capability that creates transactional module-scoped endpoint registrars.
 *
 * Commit and rollback are synchronous and idempotent. Rollback after a commit is
 * valid and must not throw.
 */
export interface IHttpEndpointRegistrarProvider {
  createRegistrar(moduleId: string): IHttpEndpointRegistrar;
  commit(moduleId: string): void;
  rollback(moduleId: string): void;
}
