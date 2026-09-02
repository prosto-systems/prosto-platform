import type { PlatformModuleEnvelope } from '@/modularity/index.js';

/**
 * @alpha
 * Graph node representing a module and its dependencies.
 */
export interface IGraphNode {
  readonly moduleEnvelope: PlatformModuleEnvelope;
  readonly dependencyIds: readonly string[];
}

/**
 * @alpha
 * Dependency graph contract for module dependency management.
 */
export interface IDependencyGraph {
  readonly modules: readonly PlatformModuleEnvelope[];
  readonly size: number;
  addModule(moduleEnvelope: PlatformModuleEnvelope): void;
  removeModule(moduleId: string): void;
  getDependencies(moduleId: string): readonly string[];
  getDependents(moduleId: string): readonly string[];
  hasModule(moduleId: string): boolean;
  getModule(moduleId: string): PlatformModuleEnvelope | undefined;
  getModuleIds(): readonly string[];
}
