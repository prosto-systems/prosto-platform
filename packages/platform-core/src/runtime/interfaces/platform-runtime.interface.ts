import type { IRuntimeOperationalReports } from '@/diagnostics/index.js';

/**
 * @alpha
 * Active platform runtime with startup reports and lifecycle control.
 */
export interface IPlatformRuntime {
  readonly startedModuleIds: readonly string[];
  readonly started: boolean;
  readonly degraded: boolean;
  readonly stopped: boolean;
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
   * Write a marker file so the next startup rebuilds the probing folder from scratch.
   * Called at runtime after install/uninstall when loaded assemblies are locked.
   */
  invalidateProbingFolder(): Promise<void>;
}
