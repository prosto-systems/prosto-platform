/**
 * @alpha
 * An open, namespaced permission identifier used by admin shell plugins.
 */
export type AdminShellPermissionType = `${string}:${string}`;

/**
 * @alpha
 * Provides permission checks to admin shell plugins without exposing identity or session data.
 */
export interface IAdminShellAuthService {
  /**
   * Returns whether the current principal has the requested permission.
   */
  can(permission: AdminShellPermissionType): boolean;
}
