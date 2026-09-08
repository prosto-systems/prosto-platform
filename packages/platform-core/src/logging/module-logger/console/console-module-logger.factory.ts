import type {
  IPlatformModuleLogger,
  ISecretsRedactor,
} from '@prosto/platform-sdk/platform';
import type {
  ICreateModuleLoggerOptions,
  IModuleLoggerFactory,
} from '../interfaces/index.js';
import { ConsoleModuleLogger } from './console-module-logger.js';

export class ConsoleModuleLoggerFactory implements IModuleLoggerFactory {
  constructor(private readonly _secretsRedactor?: ISecretsRedactor) {}

  create(options: ICreateModuleLoggerOptions): IPlatformModuleLogger {
    return new ConsoleModuleLogger(options.moduleId, this._secretsRedactor);
  }
}
