import type {
  IEventBus,
  IModuleContext,
  IServiceRegistry,
} from '@prosto/platform-sdk';
import type { IModuleLoggerFactory } from '@/logging/index.js';
import type {
  ICreateModuleContextOptions,
  IModuleContextFactory,
} from '../interfaces/index.js';

export class ModuleContextFactory implements IModuleContextFactory {
  constructor(
    private readonly _moduleLoggerFactory: IModuleLoggerFactory,
    private readonly _services: IServiceRegistry,
    private readonly _eventBus: IEventBus,
  ) {
  }

  create(options: ICreateModuleContextOptions): IModuleContext {
    // TODO: Add platform config
    const config: Record<string, unknown> = {};

    const logger = this._moduleLoggerFactory.create({
      moduleId: options.moduleId,
    });

    return {
      config,
      logger,
      moduleId: options.moduleId,
      sdkVersion: options.sdkVersion,
      startupPolicy: options.startupPolicy,
      services: this._services,
      eventBus: this._eventBus,
      getConfig<TValue = unknown>(key: string): TValue | undefined {
        return config[key] as TValue | undefined;
      },
    };
  }
}
