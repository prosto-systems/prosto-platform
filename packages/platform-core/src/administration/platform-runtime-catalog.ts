import type {
  IAdminPluginDescriptor,
  IPlatformRuntimeCatalog,
  IPlatformRuntimeSnapshot,
} from '@prosto/platform-sdk/platform';
import type { PlatformModuleEnvelope } from '@/modularity/index.js';
import { getAdminModuleAssets } from './admin-module-assets.registry.js';

/** @internal Sanitized immutable runtime view for administration modules. */
export class PlatformRuntimeCatalog implements IPlatformRuntimeCatalog {
  private _descriptors: readonly IAdminPluginDescriptor[] = Object.freeze([]);
  private _snapshot: IPlatformRuntimeSnapshot;

  constructor(name: string, version: string) {
    this._snapshot = Object.freeze({
      modules: Object.freeze([]),
      name,
      version,
    });
  }

  replace(
    moduleEnvelopes: readonly PlatformModuleEnvelope[],
    startedModules: readonly PlatformModuleEnvelope[],
  ): void {
    const startedModuleIds = new Set(startedModules.map((module) => module.id));
    const modulesById = new Map(
      moduleEnvelopes.map((module) => [module.id, module]),
    );
    const orderedModules = [
      ...startedModules,
      ...[...modulesById.values()]
        .filter((module) => !startedModuleIds.has(module.id))
        .sort((left, right) => left.id.localeCompare(right.id)),
    ];

    this._snapshot = Object.freeze({
      name: this._snapshot.name,
      version: this._snapshot.version,
      modules: Object.freeze(
        orderedModules.map((module) =>
          Object.freeze({
            id: module.id,
            status: startedModuleIds.has(module.id) ? 'healthy' : 'degraded',
            title: module.title,
            version: module.version,
          }),
        ),
      ),
    });

    this._descriptors = Object.freeze(
      startedModules.flatMap((module) => {
        const assets = getAdminModuleAssets(module);

        return assets ? [Object.freeze({ plugin: assets.plugin })] : [];
      }),
    );
  }

  getSnapshot(): IPlatformRuntimeSnapshot {
    return this._snapshot;
  }

  getAdminPluginDescriptors(): readonly IAdminPluginDescriptor[] {
    return this._descriptors;
  }
}
