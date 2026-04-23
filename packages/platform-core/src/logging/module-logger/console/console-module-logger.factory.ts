import type { IModuleLogger } from '@prosto/platform-sdk';
import type {
  ICreateModuleLoggerOptions,
  IModuleLoggerFactory,
} from '../../../module-context/module-context.types.js';
import { ConsoleModuleLogger } from './console-module-logger.js';

export class ConsoleModuleLoggerFactory implements IModuleLoggerFactory {
  create(options: ICreateModuleLoggerOptions): IModuleLogger {
    return new ConsoleModuleLogger(options.moduleId);
  }
}
