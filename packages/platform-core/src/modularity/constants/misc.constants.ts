/**
 * @alpha
 * Enum representing the different states of a module.
 */
export enum ModuleState {
  /**
   * Manifest metadata is available, but executable code is not loaded.
   */
  NotInitialized = 'NOT_INITIALIZED',

  /**
   * Executable module code is loaded and can be initialized.
   */
  ReadyForInitialization = 'READY_FOR_INITIALIZATION',

  /**
   * The module's `init()` hook is executing.
   */
  Initializing = 'INITIALIZING',

  /**
   * The module's `init()` hook completed and it is ready to start.
   */
  Initialized = 'INITIALIZED',

  /**
   * The module's `start()` hook is executing.
   */
  Starting = 'STARTING',

  /**
   * The module's `start()` hook completed successfully.
   */
  Started = 'STARTED',

  /**
   * The module's `start()` hook failed.
   */
  NotStarted = 'NOT_STARTED',
}
