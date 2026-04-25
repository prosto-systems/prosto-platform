import type { IModuleLogger } from '@prosto/platform-sdk';

export interface ICreateModuleLoggerOptions {
  readonly moduleId: string;
}

export interface IModuleLoggerFactory {
  create(options: ICreateModuleLoggerOptions): IModuleLogger;
}
