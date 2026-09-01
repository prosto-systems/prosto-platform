/**
 * @alpha
 * Enum representing the different states of a module.
 *
 * TODO: Rename to `ModuleState`
 */
export enum ModuleNewState {
  /**
   * Initial state for modules. The module is defined,
   * but it has not been loaded, retrieved or initialized yet.
   */
  NotInitialized = 'NOT_INITIALIZED',

  /**
   * The assembly that holds the Module is present.
   * This means the module can be instantiated and initialized.
   */
  ReadyForInitialization = 'READY_FOR_INITIALIZATION',

  /**
   * The module is currently Initializing.
   * This means the module is being initialized and is not ready for starting.
   */
  Initializing = 'INITIALIZING',

  /**
   * The module is initialized and ready to start.
   */
  Initialized = 'INITIALIZED',

  /**
   * The module is currently starting.
   */
  Starting = 'STARTING',

  /**
   * The module is started and ready to be used.
   */
  Started = 'STARTED',
}
