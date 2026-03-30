import type {
  MODULE_LIFECYCLE_STAGES,
  STARTUP_POLICIES,
} from '../constants/index.js';

/**
 * @stable
 * A single lifecycle stage identifier.
 */
export type ModuleLifecycleStageType = (typeof MODULE_LIFECYCLE_STAGES)[number];

/**
 * @stable
 * Startup policy marker used for failure semantics.
 */
export type StartupPolicyType = (typeof STARTUP_POLICIES)[number];

/**
 * @stable
 * Common lifecycle handler return contract.
 */
export type ModuleLifecycleResultType = void | Promise<void>;
