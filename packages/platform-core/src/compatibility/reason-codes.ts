import type { ModuleLifecycleStageType } from '@prosto/platform-sdk';

export enum RuntimeReasonCodes {
  ManifestInvalid = 'MANIFEST_INVALID',
  IntegrityCheckFailed = 'INTEGRITY_CHECK_FAILED',
  CompatibilityMismatch = 'COMPATIBILITY_MISMATCH',
  DependencyCycleDetected = 'DEPENDENCY_CYCLE_DETECTED',
  DependencyMissing = 'DEPENDENCY_MISSING',
  LifecycleRegisterFailed = 'LIFECYCLE_REGISTER_FAILED',
  LifecycleInitFailed = 'LIFECYCLE_INIT_FAILED',
  LifecycleStartFailed = 'LIFECYCLE_START_FAILED',
  ShutdownTimeout = 'SHUTDOWN_TIMEOUT',
}

export type RuntimeReasonCodeType = `${RuntimeReasonCodes}`;

export const LIFECYCLE_PHASE_TO_REASON_CODE: Readonly<
  Record<Exclude<ModuleLifecycleStageType, 'stop'>, RuntimeReasonCodeType>
> = {
  register: 'LIFECYCLE_REGISTER_FAILED',
  init: 'LIFECYCLE_INIT_FAILED',
  start: 'LIFECYCLE_START_FAILED',
};
