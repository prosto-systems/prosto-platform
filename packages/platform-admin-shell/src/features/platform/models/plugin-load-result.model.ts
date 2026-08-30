/**
 * Current loading state for a manifest-declared admin plugin.
 */
export type PluginLoadStatusType = 'pending' | 'loaded' | 'failed';

/**
 * Sanitized reason why an admin plugin could not be loaded.
 */
export type PluginLoadFailureCodeType =
  | 'runtime_incompatible'
  | 'asset_url_rejected'
  | 'style_load_failed'
  | 'entry_import_failed'
  | 'entry_timeout'
  | 'invalid_entry'
  | 'registration_failed'
  | 'duplicate_plugin';

/**
 * A user-safe result of loading one admin plugin.
 */
export interface IPluginLoadResult {
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly status: PluginLoadStatusType;
  readonly code?: PluginLoadFailureCodeType;
}
