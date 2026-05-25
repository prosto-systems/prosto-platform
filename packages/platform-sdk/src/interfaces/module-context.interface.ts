/* eslint-disable @typescript-eslint/no-explicit-any */
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
  readonly environment: string;
  readonly startupPolicy: StartupPolicyType;
  readonly sdkVersion: string;
  readonly eventBus: IEventBus;
  readonly services: IServiceRegistry;
  readonly logger: IModuleLogger;
  readonly config: Readonly<Record<string, any>>;
  getConfigValue<T>(key: string, defaultValue?: T): Readonly<T>;
}
