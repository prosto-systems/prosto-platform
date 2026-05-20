/**
 * @alpha
 * Configuration options for artifact caching.
 */
export interface IArtifactCacheOptions {
  /**
   * Path to the cache directory
   * @default .cache/module-artifacts
   */
  readonly basePath?: string;
  /**
   * Maximum age of cached artifacts in milliseconds
   * @default 14 days
   */
  readonly maxAgeMs?: number;
  /**
   * Maximum size of the cache in bytes
   * @default 500MB
   */
  readonly maxSizeBytes?: number;
}
