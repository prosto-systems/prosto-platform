/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IEventBus } from '@/platform/events/index.js';
import type { IHttpModuleContext } from '@/platform/http/index.js';
import type { IPersistenceModuleContext } from '@/platform/persistence/index.js';
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
 * Lifecycle-scoped host capabilities available to a platform module.
 */
export interface IPlatformModuleCapabilities {
  /** Persistence registration is available only during init(). */
  readonly persistence?: IPersistenceModuleContext;
  /** HTTP endpoint registration is available only during init() with an HTTP host. */
  readonly http?: IHttpModuleContext;
}

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
  readonly capabilities: IPlatformModuleCapabilities;
  readonly logger: IPlatformModuleLogger;
  readonly config: Readonly<Record<string, any>>;
  getConfigValue<T>(key: string, defaultValue?: T): Readonly<T>;
}
