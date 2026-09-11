import type { IPersistenceDescriptorRegistrar } from './persistence-descriptor-registrar.interface.js';

/** @alpha Lifecycle state of persistence exposed to feature modules. */
export type PersistenceModuleStateType = 'collecting' | 'ready' | 'unavailable';

/**
 * @alpha
 * Persistence surface exposed in a module context.
 *
 * Descriptors may be registered only from init(). Database queries are forbidden
 * until start(), when an adapter publishes its ready native service token.
 */
export interface IPersistenceModuleContext {
  readonly state: PersistenceModuleStateType;
  readonly descriptors?: IPersistenceDescriptorRegistrar;
}
