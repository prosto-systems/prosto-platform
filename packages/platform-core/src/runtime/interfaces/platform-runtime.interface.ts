import type { IRuntimeOperationalReports } from '@/diagnostics/index.js';

/**
 * @alpha
 * Active platform runtime with startup reports and lifecycle control.
 */
export interface IPlatformRuntime {
  /** IDs of modules whose `start()` hooks completed successfully. */
  readonly startedModuleIds: readonly string[];
  /** Whether startup completed without a fatal runtime status. */
  readonly started: boolean;
  /** Whether startup completed with skipped or failed modules. */
  readonly degraded: boolean;
  /** Whether runtime shutdown has completed. */
  readonly stopped: boolean;
  /** Startup and shutdown diagnostic reports produced so far. */
  readonly reports: IRuntimeOperationalReports;

  /**
   * Start the runtime and all modules.
   * Orchestrates the bootstrap process and generates a startup report.
   */
  start(): Promise<void>;

  /**
   * Stop the runtime and all running modules.
   * Cleans up resources and generates a shutdown report.
   */
  stop(): Promise<void>;

  /**
   * Requests a complete probing-directory rebuild on the next startup.
   *
   * The method writes a marker instead of deleting loaded module files. Use it
   * after installing or uninstalling discovery packages when current-process
   * module entries may still be in use.
   */
  invalidateProbingFolder(): Promise<void>;
}
