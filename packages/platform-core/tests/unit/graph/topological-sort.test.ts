import { describe, expect, it } from 'vitest';
import type { IPlatformModule } from '@prosto/platform-sdk';
import { createDependencyGraph } from '../../../src/graph/dependency-graph.js';
import { DependencyCycleError } from '../../../src/graph/graph.errors.js';
import { topologicalSort } from '../../../src/graph/topological-sort.js';

describe('topologicalSort', () => {
  it('orders modules by dependency', () => {
    const modules = [
      { manifest: { id: 'c', dependencies: [{ id: 'b', version: '^1.0.0', optional: false }] } },
      { manifest: { id: 'a', dependencies: [] } },
      { manifest: { id: 'b', dependencies: [{ id: 'a', version: '^1.0.0', optional: false }] } },
    ] as unknown as readonly IPlatformModule[];

    const graph = createDependencyGraph(modules);
    const result = topologicalSort(graph);

    expect(result.orderedModules.map((m) => m.manifest.id)).toEqual(['a', 'b', 'c']);
  });

  it('detects missing dependencies', () => {
    const modules = [
      { manifest: { id: 'a', dependencies: [{ id: 'missing', version: '^1.0.0', optional: false }] } },
    ] as unknown as readonly IPlatformModule[];

    const graph = createDependencyGraph(modules);
    const result = topologicalSort(graph);

    expect(result.missingDependencies.has('a')).toBe(true);
    expect(result.missingDependencies.get('a')).toEqual(['missing']);
    expect(result.orderedModules.map((m) => m.manifest.id)).toEqual(['a']);
  });

  it('throws DependencyCycleError for cyclic dependencies', () => {
    const modules = [
      { manifest: { id: 'a', dependencies: [{ id: 'b', version: '^1.0.0', optional: false }] } },
      { manifest: { id: 'b', dependencies: [{ id: 'a', version: '^1.0.0', optional: false }] } },
    ] as unknown as Parameters<typeof createDependencyGraph>[0];

    const graph = createDependencyGraph(modules);

    expect(() => topologicalSort(graph)).toThrow(DependencyCycleError);
  });
});
