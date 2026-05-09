import type { IPlatformModule } from '@prosto/platform-sdk';

/**
 * @alpha
 * Graph node representing a module and its dependencies.
 */
export interface IGraphNode {
  readonly module: IPlatformModule;
  readonly dependencyIds: readonly string[];
}

/**
 * @alpha
 * Dependency graph contract for module dependency management.
 */
export interface IDependencyGraph {
  readonly modules: readonly IPlatformModule[];
  readonly size: number;
  addModule(module: IPlatformModule): void;
  removeModule(moduleId: string): void;
  getDependencies(moduleId: string): readonly string[];
  getDependents(moduleId: string): readonly string[];
  hasModule(moduleId: string): boolean;
  getModule(moduleId: string): IPlatformModule | undefined;
  getModuleIds(): readonly string[];
}
