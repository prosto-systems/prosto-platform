import type { IPlatformRuntimeComponentIdentity } from './platform-runtime-component-identity.interface.js';
import type { PlatformRuntimeAdapterRoleType } from './platform-runtime-adapter.interface.js';

/** @alpha Adapter lifecycle phases included in runtime diagnostics. */
export type PlatformRuntimeAdapterLifecycleStageType =
  'initialize' | 'start' | 'stop';

/** @alpha Sanitized outcome of one adapter lifecycle phase. */
export type PlatformRuntimeAdapterLifecycleStatusType = 'succeeded' | 'failed';

/** @alpha Sanitized diagnostic for one required adapter lifecycle event. */
export interface IPlatformRuntimeAdapterDiagnostic {
  readonly adapter: IPlatformRuntimeComponentIdentity;
  readonly role: PlatformRuntimeAdapterRoleType;
  readonly stage: PlatformRuntimeAdapterLifecycleStageType;
  readonly status: PlatformRuntimeAdapterLifecycleStatusType;
  readonly code?: string;
  readonly message?: string;
}

/**
 * @alpha
 * Runtime diagnostics separate adapter lifecycle records from module arrays and
 * module probe identifiers.
 */
export interface IPlatformRuntimeAdapterDiagnostics {
  readonly adapters: readonly IPlatformRuntimeAdapterDiagnostic[];
}
