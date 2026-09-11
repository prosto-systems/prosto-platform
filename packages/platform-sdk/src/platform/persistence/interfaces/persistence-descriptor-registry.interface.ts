import type { IPlatformRuntimeComponentIdentity } from '@/platform/adapters/index.js';
import type { IPersistenceDescriptor } from './persistence-descriptor.interface.js';
import type { IPersistenceDescriptorRegistrar } from './persistence-descriptor-registrar.interface.js';

/**
 * @alpha
 * Collects transactional persistence declarations during component initialization.
 */
export interface IPersistenceDescriptorRegistry {
  /**
   * Registers the single platform descriptor supplied by application composition.
   */
  registerPlatform(descriptor: IPersistenceDescriptor): void;

  /** Creates a descriptor registrar bound to one module or adapter identity. */
  createRegistrar(
    owner: IPlatformRuntimeComponentIdentity,
  ): IPersistenceDescriptorRegistrar;

  /**
   * Rolls back all persistence declarations registered for the given component.
   */
  rollback(owner: IPlatformRuntimeComponentIdentity): void;

  /**
   * Seals the persistence descriptor registry.
   */
  seal(): readonly IPersistenceDescriptor[];
}
