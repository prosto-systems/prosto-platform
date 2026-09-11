/**
 * @internal
 * Marker created in the probing directory to request a full rebuild on the
 * next runtime startup.
 */
export const REBUILD_MARKER_FILE_NAME = '.rebuild';

/**
 * @alpha
 * Enum representing the different stages of the runtime startup process.
 */
export enum RuntimeStage {
  Discover = 'discover',
  Validate = 'validate',
  Resolve = 'resolve',
  Lifecycle = 'lifecycle',
  Persistence = 'persistence',
  Shutdown = 'shutdown',
}

/**
 * @alpha
 * Canonical error codes for runtime diagnostic reporting.
 */
export enum RuntimeErrorCodes {
  StartupFailed = 'STARTUP_FAILED',
  BootstrapAborted = 'BOOTSTRAP_ABORTED',
  LoadManifestFiled = 'LOAD_MANIFEST_FILED',
  ManifestInvalid = 'MANIFEST_INVALID',
  CompatibilityMismatch = 'COMPATIBILITY_MISMATCH',
  ConfigAccessDenied = 'CONFIG_ACCESS_DENIED',
  ConfigCapabilityInvalid = 'CONFIG_CAPABILITY_INVALID',
  ConfigSectionNotAllowlisted = 'CONFIG_SECTION_NOT_ALLOWLISTED',
  ConfigWildcardForbidden = 'CONFIG_WILDCARD_FORBIDDEN',
  DependencyCycleDetected = 'DEPENDENCY_CYCLE_DETECTED',
  DependencyMissing = 'DEPENDENCY_MISSING',
  DependencyFailed = 'DEPENDENCY_FAILED',
  CopyModuleFailed = 'COPY_MODULE_FAILED',
  LoadModuleInstanceFailed = 'LOAD_MODULE_INSTANCE_FAILED',
  LifecycleInitFailed = 'LIFECYCLE_INIT_FAILED',
  LifecycleStartFailed = 'LIFECYCLE_START_FAILED',
  HttpEndpointRegistrationFailed = 'HTTP_ENDPOINT_REGISTRATION_FAILED',
  PersistenceFailed = 'PERSISTENCE_FAILED',
  ShutdownTimeout = 'SHUTDOWN_TIMEOUT',
  ShutdownFailed = 'SHUTDOWN_FAILED',
}
