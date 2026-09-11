import type { IPersistenceDescriptor } from './persistence-descriptor.interface.js';

/** @alpha Owner-scoped persistence descriptor declaration capability. */
export interface IPersistenceDescriptorRegistrar {
  register(descriptor: IPersistenceDescriptor): void;
}
