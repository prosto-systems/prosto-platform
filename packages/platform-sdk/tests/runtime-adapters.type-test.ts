import type {
  DeepReadonlyType,
  IHttpRuntimeAdapter,
  IPlatformAdminAdapter,
  IPlatformRuntimeAdapterInitializationContext,
  IPlatformRuntimeAdapterDiagnostic,
  IPlatformRuntimeComponentIdentity,
  IPersistenceRuntimeAdapter,
  RequiredPlatformRuntimeAdapterType,
} from '@/platform/index.js';
import { PLATFORM_ADMIN_COMPONENT_ID } from '@/platform/index.js';

declare const adminAdapter: IPlatformAdminAdapter;
declare const persistenceAdapter: IPersistenceRuntimeAdapter;
declare const httpAdapter: IHttpRuntimeAdapter;
declare const requiredAdapter: RequiredPlatformRuntimeAdapterType;
declare const diagnostic: IPlatformRuntimeAdapterDiagnostic;
declare const initializationContext: IPlatformRuntimeAdapterInitializationContext;

const adminId: typeof PLATFORM_ADMIN_COMPONENT_ID = adminAdapter.id;
const adminRole: 'admin' = adminAdapter.role;
const persistenceRole: 'persistence' = persistenceAdapter.role;
const httpRole: 'http' = httpAdapter.role;
const adapterOwner: IPlatformRuntimeComponentIdentity = {
  type: 'adapter',
  id: PLATFORM_ADMIN_COMPONENT_ID,
};
const moduleOwner: IPlatformRuntimeComponentIdentity = {
  type: 'module',
  id: 'module-test',
};

if (requiredAdapter.role === 'admin') {
  const narrowedAdminId: typeof PLATFORM_ADMIN_COMPONENT_ID =
    requiredAdapter.id;
  void narrowedAdminId;
}

type AdapterConfigType = DeepReadonlyType<{
  nested: { enabled: boolean };
  values: string[];
}>;

declare const config: AdapterConfigType;

// @ts-expect-error Adapter configuration is recursively immutable.
config.nested.enabled = false;
// @ts-expect-error Adapter configuration arrays are immutable.
config.values.push('changed');
// @ts-expect-error The fixed admin identity cannot be changed.
adminAdapter.id = 'other-admin';
// @ts-expect-error The adapter-scoped configuration cannot be reassigned.
initializationContext.config.feature = { enabled: false };
// @ts-expect-error Every runtime adapter must implement its lifecycle methods.
const incompleteAdminAdapter: IPlatformAdminAdapter = {
  id: PLATFORM_ADMIN_COMPONENT_ID,
  role: 'admin',
};

void adminId;
void adminRole;
void persistenceRole;
void httpRole;
void adapterOwner;
void moduleOwner;
void diagnostic;
void incompleteAdminAdapter;
