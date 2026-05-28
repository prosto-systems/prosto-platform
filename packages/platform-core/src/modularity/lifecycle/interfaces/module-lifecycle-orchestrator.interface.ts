import type {
  IPlatformModule,
  IPlatformModuleManifest,
  StartupPolicyType,
} from '@prosto/platform-sdk';
import type {
  IModuleLifecycleExecutionIssue,
} from './module-lifecycle-execution-issue.interface.js';
import type {
  IModuleLifecycleShutdownIssue,
} from './module-lifecycle-shutdown-issue.interface.js';

/**
 * @alpha
 * Options for module lifecycle startup.
 */
export interface IModuleLifecycleStartupOptions {
  startupPolicy: StartupPolicyType,
  sdkVersion: string,
}

/**
 * @alpha
 * Options for module lifecycle shutdown.
 */
export interface IModuleLifecycleShutdownOptions {
  startupPolicy: StartupPolicyType,
  sdkVersion: string,
  timeoutMs: number,
}

/**
 * @alpha
 * Result of modules startup.
 */
export interface IModulesStartupResult {
  readonly startedModules: readonly IPlatformModule[];
  readonly issues: readonly IModuleLifecycleExecutionIssue[];
}

/**
 * @alpha
 * Result of modules shutdown.
 */
export interface IModulesShutdownResult {
  readonly stopOrder: readonly IPlatformModuleManifest['id'][];
  readonly issues: readonly IModuleLifecycleShutdownIssue[];
}

/**
 * @alpha
 * Module lifecycle orchestrator contract for managing module startup and shutdown.
 */
export interface IModuleLifecycleOrchestrator {
  startup(
    loadedModules: readonly IPlatformModule[],
    options: IModuleLifecycleStartupOptions,
  ): Promise<IModulesStartupResult>;

  shutdown(
    startedModules: readonly IPlatformModule[],
    options: IModuleLifecycleShutdownOptions,
  ): Promise<IModulesShutdownResult>;
}
