import type {
  IHttpRequestGate,
  IHttpRequestGateInput,
  HttpRequestGateDecisionType,
} from '@prosto/platform-sdk/platform';
import type { DataSource } from 'typeorm';
import { MAINTENANCE_EXEMPT_PATH_PREFIXES } from '@/constants/index.js';
import { AdminPersistenceRepository } from './admin-persistence.repository.js';

/** @internal Cross-replica request gate backed by the shared state record. */
export class MaintenanceRequestGate implements IHttpRequestGate {
  private _repository: AdminPersistenceRepository | undefined;

  bind(dataSource: DataSource): void {
    this._repository = new AdminPersistenceRepository(dataSource);
  }

  unbind(): void {
    this._repository = undefined;
  }

  async evaluate(
    input: IHttpRequestGateInput,
  ): Promise<HttpRequestGateDecisionType> {
    if (this._isExempt(input.pathname)) {
      return { allowed: true };
    }

    if (!this._repository) {
      throw new Error('platform-admin maintenance gate is not ready.');
    }

    return (await this._repository.isMaintenanceEnabled())
      ? { allowed: false, code: 'maintenance', status: 503 }
      : { allowed: true };
  }

  private _isExempt(pathname: string): boolean {
    return MAINTENANCE_EXEMPT_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }
}
