import type { IServiceRegistry } from '@/platform/services/index.js';

/**
 * @alpha
 * Synchronous callback used by an application host to compose runtime services.
 *
 * A thenable result is rejected by the runtime because module contexts require a
 * complete registry before construction finishes.
 */
export type ServiceRegistryConfiguratorType = (
  services: IServiceRegistry,
) => void;
