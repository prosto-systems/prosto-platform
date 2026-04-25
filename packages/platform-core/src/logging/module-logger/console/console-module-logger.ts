import type { IModuleLogger } from '@prosto/platform-sdk';

export class ConsoleModuleLogger implements IModuleLogger {
  constructor(private readonly _moduleId: string) {
  }

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(`[Module:${this._moduleId}] ${message}`, context ?? {});
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(`[Module:${this._moduleId}] ${message}`, context ?? {});
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[Module:${this._moduleId}] ${message}`, context ?? {});
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(`[Module:${this._moduleId}] ${message}`, context ?? {});
  }
}
