import type { StartupPolicyType } from '../types/index.js';
import type { IEventBus } from './event-bus.interfaces.js';
import type { IModuleLogger } from './module-logger.interface.js';
import type { IServiceRegistry } from './service-registry.interface.js';

/**
 * @alpha
 * Shared runtime context passed to module lifecycle handlers.
 */
export interface IModuleContext {
  readonly moduleId: string;
  readonly sdkVersion: string;
  readonly startupPolicy: StartupPolicyType;
  readonly services: IServiceRegistry;
  readonly events: IEventBus;
  readonly logger?: IModuleLogger;
  readonly config?: Readonly<Record<string, unknown>>;
  getConfig<TValue = unknown>(key: string): TValue | undefined;
}
