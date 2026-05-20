import type { ModuleArtifactSource } from '@/loader/index.js';

/**
 * @alpha
 * Metadata stored alongside cached artifact data.
 */
export interface IArtifactCacheEntryMetadata {
  sourceRef: string;
  sourceType: `${ModuleArtifactSource}`;
  timestamp: number;
  lastAccessTimestamp?: number;
  size: number;
  checksum: string;
}
