import type { ServiceTokenType } from '../types/index.js';

/**
 * @stable
 * Typed service registry contract shared by runtime and modules.
 */
export interface IServiceRegistry {
  register<TService>(token: ServiceTokenType<TService>, service: NoInfer<TService>): void;
  resolve<TService>(token: ServiceTokenType<TService>): TService | undefined;
  has<TService>(token: ServiceTokenType<TService>): boolean;
  unregister<TService>(token: ServiceTokenType<TService>): void;
}
