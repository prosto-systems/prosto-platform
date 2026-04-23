import type { IPlatformModule } from '@prosto/platform-sdk';
import type { DependencyGraphType } from './dependency-graph.js';
import { DependencyCycleError } from './graph.errors.js';

export interface ITopologicalSortResult {
  readonly orderedModules: readonly IPlatformModule[];
  readonly missingDependencies: ReadonlyMap<string, readonly string[]>;
}

export function topologicalSort(graph: DependencyGraphType): ITopologicalSortResult {
  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const missingDependencies = new Map<string, string[]>();

  for (const [moduleId] of graph) {
    inDegree.set(moduleId, 0);
    outgoing.set(moduleId, []);
  }

  for (const [moduleId, node] of graph) {
    for (const dependencyId of node.dependencyIds) {
      if (!graph.has(dependencyId)) {
        const missing = missingDependencies.get(moduleId) ?? [];

        missing.push(dependencyId);
        missingDependencies.set(moduleId, missing.sort((left, right) => left.localeCompare(right)));

        continue;
      }

      inDegree.set(moduleId, (inDegree.get(moduleId) ?? 0) + 1);

      const targets = outgoing.get(dependencyId) ?? [];

      targets.push(moduleId);
      targets.sort((left, right) => left.localeCompare(right));

      outgoing.set(dependencyId, targets);
    }
  }

  const queue = [...inDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([moduleId]) => moduleId)
    .sort((left, right) => left.localeCompare(right));

  const orderedIds: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    orderedIds.push(current);

    for (const target of outgoing.get(current) ?? []) {
      const nextDegree = (inDegree.get(target) ?? 0) - 1;

      inDegree.set(target, nextDegree);

      if (nextDegree === 0) {
        queue.push(target);
        queue.sort((left, right) => left.localeCompare(right));
      }
    }
  }

  if (orderedIds.length !== graph.size) {
    const cyclicModuleIds = [...graph.keys()]
      .filter((moduleId) => !orderedIds.includes(moduleId))
      .sort((left, right) => left.localeCompare(right));

    throw new DependencyCycleError(cyclicModuleIds);
  }

  const orderedModules: IPlatformModule[] = [];

  for (const moduleId of orderedIds) {
    const node = graph.get(moduleId);

    if (!node) {
      throw new Error(`Resolved module "${moduleId}" is missing from dependency graph.`);
    }

    orderedModules.push(node.module);
  }

  return {
    orderedModules,
    missingDependencies,
  };
}
