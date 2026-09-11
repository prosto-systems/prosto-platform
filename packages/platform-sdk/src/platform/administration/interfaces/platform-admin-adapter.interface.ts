import type { IPlatformRuntimeAdapter } from '@/platform/adapters/index.js';
import type { PLATFORM_ADMIN_COMPONENT_ID } from '@/platform/adapters/index.js';

/** @alpha Required administration adapter with the reserved platform identity. */
export interface IPlatformAdminAdapter extends IPlatformRuntimeAdapter {
  readonly id: typeof PLATFORM_ADMIN_COMPONENT_ID;
  readonly role: 'admin';
}
