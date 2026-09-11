import type { PlatformRuntimeAdapterConfigurationType } from './platform-runtime-adapter-configuration.type.js';
import type { IPlatformRuntimeAdapterContributions } from './platform-runtime-adapter-contributions.interface.js';
import type { IPlatformRuntimeAdapterLogger } from './platform-runtime-adapter-logger.interface.js';
import type { IPlatformRuntimeComponentIdentity } from './platform-runtime-component-identity.interface.js';

/** @alpha Sanitized lifecycle state observable by transport adapters. */
export interface IPlatformRuntimeLifecycleView {
  readonly started: boolean;
  readonly stopping: boolean;
  readonly stopped: boolean;
  readonly degraded: boolean;
  readonly startedModuleIds: readonly string[];
}

/** @alpha Common context passed to every runtime-adapter lifecycle phase. */
export interface IPlatformRuntimeAdapterContext {
  readonly identity: IPlatformRuntimeComponentIdentity;
  readonly environment: string;
  readonly config: PlatformRuntimeAdapterConfigurationType;
  readonly logger: IPlatformRuntimeAdapterLogger;
}

/** @alpha Declaration-only context passed to `initialize()`. */
export interface IPlatformRuntimeAdapterInitializationContext extends IPlatformRuntimeAdapterContext {
  readonly contributions: IPlatformRuntimeAdapterContributions;
}

/** @alpha Context passed to an adapter after prerequisite barriers succeed. */
export interface IPlatformRuntimeAdapterStartContext extends IPlatformRuntimeAdapterContext {
  readonly runtime: IPlatformRuntimeLifecycleView;
}

/** @alpha Context passed while stopping an adapter in reverse dependency order. */
export interface IPlatformRuntimeAdapterStopContext extends IPlatformRuntimeAdapterContext {
  readonly runtime: IPlatformRuntimeLifecycleView;
}
