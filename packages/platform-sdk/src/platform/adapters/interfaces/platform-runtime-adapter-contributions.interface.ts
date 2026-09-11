import type { IHttpEndpointRegistrar } from '@/platform/http/index.js';
import type { IPersistenceDescriptorRegistrar } from '@/platform/persistence/index.js';
import type { ServiceTokenType } from '@/platform/services/index.js';

/** @alpha Read-only service resolution available to a runtime adapter. */
export interface IPlatformRuntimeServiceResolver {
  resolve<TService>(token: ServiceTokenType<TService>): TService | undefined;
  resolveRequired<TService>(token: ServiceTokenType<TService>): TService;
  has<TService>(token: ServiceTokenType<TService>): boolean;
}

/**
 * @alpha
 * Transactional, owner-scoped service registration for one runtime adapter.
 */
export interface IPlatformRuntimeScopedServiceRegistrar extends IPlatformRuntimeServiceResolver {
  register<TService>(
    token: ServiceTokenType<TService>,
    service: NoInfer<TService>,
  ): void;

  /** Removes a service registered by this adapter's contribution scope. */
  unregister<TService>(token: ServiceTokenType<TService>): void;
}

/**
 * @alpha
 * Transactional registrars bound to the adapter context owner identity.
 */
export interface IPlatformRuntimeAdapterContributions {
  readonly services: IPlatformRuntimeScopedServiceRegistrar;
  readonly persistence?: IPersistenceDescriptorRegistrar;
  readonly http?: IHttpEndpointRegistrar;
}
