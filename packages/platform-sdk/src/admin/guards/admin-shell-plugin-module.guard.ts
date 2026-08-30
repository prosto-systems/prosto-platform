import type { IAdminShellPlugin } from '../interfaces/admin-shell-plugin-module.interface.js';

/**
 * @alpha
 * Checks whether an imported ESM namespace exposes only the admin plugin registration export.
 */
export function isAdminShellPluginModule(
  value: unknown,
): value is IAdminShellPlugin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const exports = Object.keys(value);

  return (
    exports.length === 1 &&
    exports[0] === 'registerAdminPlugin' &&
    typeof (value as Record<string, unknown>).registerAdminPlugin === 'function'
  );
}
