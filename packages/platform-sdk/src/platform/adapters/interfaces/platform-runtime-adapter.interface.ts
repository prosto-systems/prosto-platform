import type { PLATFORM_RUNTIME_ADAPTER_ROLES } from '../constants/index.js';
import type {
  IPlatformRuntimeAdapterInitializationContext,
  IPlatformRuntimeAdapterStartContext,
  IPlatformRuntimeAdapterStopContext,
} from './platform-runtime-adapter-context.interface.js';

/** @alpha One required runtime-adapter role. */
export type PlatformRuntimeAdapterRoleType =
  (typeof PLATFORM_RUNTIME_ADAPTER_ROLES)[number];

/** @alpha Common return type for runtime-adapter lifecycle methods. */
export type PlatformRuntimeAdapterLifecycleResultType = void | Promise<void>;

/**
 * @alpha
 * Framework-neutral lifecycle contract for directly composed runtime adapters.
 */
export interface IPlatformRuntimeAdapter {
  readonly id: string;
  readonly role: PlatformRuntimeAdapterRoleType;
  initialize(
    context: IPlatformRuntimeAdapterInitializationContext,
  ): PlatformRuntimeAdapterLifecycleResultType;
  start(
    context: IPlatformRuntimeAdapterStartContext,
  ): PlatformRuntimeAdapterLifecycleResultType;
  stop(
    context: IPlatformRuntimeAdapterStopContext,
  ): PlatformRuntimeAdapterLifecycleResultType;
}
