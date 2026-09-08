import type { IAdminShellPluginInfo } from '@/admin/interfaces/index.js';
import type { ModuleIdentifierType } from '@/platform/modularity/index.js';

/** @alpha Sanitized runtime health exposed for a started platform module. */
export type PlatformModuleRuntimeStatusType = 'healthy' | 'degraded';

/** @alpha Immutable, sanitized runtime information for one platform module. */
export interface IPlatformModuleRuntimeSnapshot {
  readonly id: ModuleIdentifierType;
  readonly status: PlatformModuleRuntimeStatusType;
  readonly title: string;
  readonly version: string;
}

/** @alpha Immutable, sanitized snapshot of the running platform. */
export interface IPlatformRuntimeSnapshot {
  readonly modules: readonly IPlatformModuleRuntimeSnapshot[];
  readonly name: string;
  readonly version: string;
}

/**
 * @alpha
 * Provides immutable runtime metadata without exposing module paths,
 * configuration, exceptions, or lifecycle internals.
 */
export interface IPlatformRuntimeCatalog {
  getSnapshot(): IPlatformRuntimeSnapshot;

  getAdminPluginDescriptors(): readonly IAdminPluginDescriptor[];
}

/**
 * @alpha
 * Public plugin descriptor ordered by the platform module lifecycle dependency
 * order. Asset paths and hashes are cache identities, not authenticity claims.
 */
export interface IAdminPluginDescriptor {
  readonly plugin: IAdminShellPluginInfo;
}
