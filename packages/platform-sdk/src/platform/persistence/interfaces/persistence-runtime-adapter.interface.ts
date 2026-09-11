import type { IPlatformRuntimeAdapter } from '@/platform/adapters/index.js';
import type { IPersistenceDescriptorRegistry } from './persistence-descriptor-registry.interface.js';

/** @alpha Required persistence adapter lifecycle and descriptor surface. */
export interface IPersistenceRuntimeAdapter extends IPlatformRuntimeAdapter {
  readonly role: 'persistence';
  readonly descriptors: IPersistenceDescriptorRegistry;
}
