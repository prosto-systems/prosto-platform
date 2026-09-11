import type { IPlatformAdminAdapter } from '@/platform/administration/index.js';
import type { IHttpRuntimeAdapter } from '@/platform/http/index.js';
import type { IPersistenceRuntimeAdapter } from '@/platform/persistence/index.js';

/**
 * @alpha
 * Discriminated union of the three adapters required by every platform runtime.
 */
export type RequiredPlatformRuntimeAdapterType =
  IPlatformAdminAdapter | IPersistenceRuntimeAdapter | IHttpRuntimeAdapter;
