/**
 * @alpha
 * Identifies whether a descriptor belongs to the platform, a feature module,
 * or a directly composed runtime adapter.
 */
export type PersistenceOwnerType = 'platform' | 'module' | 'adapter';

/**
 * @alpha
 * Opaque adapter-owned persistence metadata.
 */
export type PersistenceDescriptorPayloadType = unknown;

/**
 * @alpha
 * Generic persistence declaration collected during component initialization.
 */
export interface IPersistenceDescriptor {
  readonly owner: PersistenceOwnerType;
  readonly ownerId: string;
  readonly payload: PersistenceDescriptorPayloadType;
  readonly requiredDriverCapabilities?: readonly string[];
}
