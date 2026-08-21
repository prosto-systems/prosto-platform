import type { IAdminShellAuthorization } from './admin-shell-authorization.interface.js';

/**
 * @alpha
 * Runtime context passed to an admin shell plugin registration callback.
 */
export interface IAdminShellContext {
  readonly moduleId: string;
  readonly auth: IAdminShellAuthorization;
}
