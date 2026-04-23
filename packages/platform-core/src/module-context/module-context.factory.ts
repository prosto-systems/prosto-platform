import type {
  IEventBus,
  IModuleContext,
  IServiceRegistry,
} from '@prosto/platform-sdk';
import type {
  ICreateModuleContextOptions,
  ILifecycleExecutionContextFactory,
} from '../lifecycle/lifecycle.types.js';
import type { IModuleLoggerFactory } from './module-context.types.js';

export class ModuleContextFactory implements ILifecycleExecutionContextFactory {
  constructor(
    private readonly _services: IServiceRegistry,
    private readonly _events: IEventBus,
    private readonly _loggerFactory: IModuleLoggerFactory,
  ) {
  }

  create(options: ICreateModuleContextOptions): IModuleContext {
    // TODO: Add platform config
    const config: Record<string, unknown> = {};
    const logger = this._loggerFactory.create({ moduleId: options.moduleId });

    return {
      config,
      logger,
      moduleId: options.moduleId,
      sdkVersion: options.sdkVersion,
      startupPolicy: options.startupPolicy,
      services: this._services,
      events: this._events,
      getConfig<TValue = unknown>(key: string): TValue | undefined {
        return config[key] as TValue | undefined;
      },
    };
  }
}
