import type { IServiceRegistry, ServiceTokenType } from '@prosto/platform-sdk';

export class InMemoryServiceRegistry implements IServiceRegistry {
  private readonly _registry = new Map<ServiceTokenType<unknown>, unknown>();

  register<TService>(token: ServiceTokenType<TService>, service: NoInfer<TService>): void {
    if (this._registry.has(token)) {
      throw new Error(`Service with token ${token.toString()} already registered.`);
    }

    this._registry.set(token, service);
  }

  override<TService>(token: ServiceTokenType<TService>, service: NoInfer<TService>): void {
    if (!this._registry.has(token)) {
      throw new Error(`Service with token ${token.toString()} not found.`);
    }

    this._registry.set(token, service);
  }

  resolve<TService>(token: ServiceTokenType<TService>): TService | undefined {
    return this._registry.get(token) as TService | undefined;
  }

  has<TService>(token: ServiceTokenType<TService>): boolean {
    return this._registry.has(token);
  }

  unregister<TService>(token: ServiceTokenType<TService>): void {
    this._registry.delete(token);
  }
}
