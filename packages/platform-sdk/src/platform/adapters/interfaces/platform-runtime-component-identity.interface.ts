/** @alpha Runtime component kinds that may own transactional contributions. */
export type PlatformRuntimeComponentType = 'module' | 'adapter';

/**
 * @alpha
 * Stable identity of a feature module or directly composed runtime adapter.
 */
export interface IPlatformRuntimeComponentIdentity {
  readonly type: PlatformRuntimeComponentType;
  readonly id: string;
}
