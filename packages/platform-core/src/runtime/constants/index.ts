/**
 * @alpha
 * Enum representing the different stages of the runtime startup process.
 */
export enum RuntimeStage {
  Discover = 'discover',
  Validate = 'validate',
  Resolve = 'resolve',
  Lifecycle = 'lifecycle',
  Shutdown = 'shutdown',
}

/**
 * @alpha
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
  DependencyFailed = 'DEPENDENCY_FAILED',
  LifecycleRegisterFailed = 'LIFECYCLE_REGISTER_FAILED',
  LifecycleInitFailed = 'LIFECYCLE_INIT_FAILED',
  LifecycleStartFailed = 'LIFECYCLE_START_FAILED',
  ShutdownTimeout = 'SHUTDOWN_TIMEOUT',
  ShutdownFailed = 'SHUTDOWN_FAILED',
}
