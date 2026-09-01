/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IEventBus } from '@/platform/events/index.js';
import type { IServiceRegistry } from '@/platform/services/index.js';
import type { STARTUP_POLICIES } from '../constants/index.js';
import type { IPlatformModuleLogger } from './platform-module-logger.interface.js';

/**
 * @alpha
 * Startup policy marker used for failure semantics.
 */
export type PlatformStartupPolicyType = (typeof STARTUP_POLICIES)[number];

/**
 * @alpha
 * Shared runtime context passed to module lifecycle handlers.
 */
export interface IPlatformModuleContext {
  readonly moduleId: string;
  readonly environment: string;
  readonly startupPolicy: PlatformStartupPolicyType;
  readonly sdkVersion: string;
  readonly eventBus: IEventBus;
  readonly services: IServiceRegistry;
  readonly logger: IPlatformModuleLogger;
  readonly config: Readonly<Record<string, any>>;
  getConfigValue<T>(key: string, defaultValue?: T): Readonly<T>;
}
