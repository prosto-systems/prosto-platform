import type { ModuleLifecycleStageType } from '@prosto/platform-sdk';

/**
 * @beta
 * Canonical reason codes for runtime diagnostic reporting.
 */
export enum RuntimeReasonCodes {
  SourceDescriptorInvalid = 'SOURCE_DESCRIPTOR_INVALID',
  SourceUrlInvalid = 'SOURCE_URL_INVALID',
  SourceFetchFailed = 'SOURCE_FETCH_FAILED',
  SourceIntegrityMismatch = 'SOURCE_INTEGRITY_MISMATCH',
  SourceExtractionFailed = 'SOURCE_EXTRACTION_FAILED',
  SourceEntryResolveFailed = 'SOURCE_ENTRY_RESOLVE_FAILED',
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

/**
 * @beta
 * A type representing a string literal that corresponds to values present in `RuntimeReasonCodes`.
 */
export type RuntimeReasonCodeType = `${RuntimeReasonCodes}`;

/**
 * @beta
 * Maps lifecycle startup phases to their corresponding reason codes.
 */
export const LIFECYCLE_PHASE_TO_REASON_CODE: Readonly<
  Record<Exclude<ModuleLifecycleStageType, 'stop'>, RuntimeReasonCodeType>
> = {
  register: 'LIFECYCLE_REGISTER_FAILED',
  init: 'LIFECYCLE_INIT_FAILED',
  start: 'LIFECYCLE_START_FAILED',
};
