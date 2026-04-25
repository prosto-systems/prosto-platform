import type { IPlatformModule } from '@prosto/platform-sdk';

export interface IDependencyGraphNode {
  readonly module: IPlatformModule;
  readonly dependencyIds: readonly string[];
}

export type DependencyGraphType = ReadonlyMap<string, IDependencyGraphNode>;

export function createDependencyGraph(
  modules: readonly IPlatformModule[],
): DependencyGraphType {
  const sorted = [...modules].sort((left, right) => left.manifest.id.localeCompare(right.manifest.id));

  const graph = new Map<string, IDependencyGraphNode>();

  for (const module of sorted) {
    const dependencyIds = module
      .manifest
      .dependencies
      .filter((dependency) => !dependency.optional)
      .map((dependency) => dependency.id)
      .sort((left, right) => left.localeCompare(right));

    graph.set(module.manifest.id, {
      module,
      dependencyIds,
    });
  }

  return graph;
}
