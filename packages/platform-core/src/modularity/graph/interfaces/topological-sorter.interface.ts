import type { IPlatformModule } from '@prosto/platform-sdk';
import type { IDependencyGraph } from './dependency-graph.interface.js';

/**
 * @alpha
 * Result of topological sort operation.
 */
export interface ITopologicalSortResult {
  readonly orderedModules: readonly IPlatformModule[];
  readonly missingDependencies: ReadonlyMap<string, readonly string[]>;
}

/**
 * @alpha
 * Topological sorter contract for dependency ordering.
 */
export interface ITopologicalSorter {
  sort(graph: IDependencyGraph): ITopologicalSortResult;
}
