import type { IAdminShellBladeScope } from '../interfaces/index.js';
import { inject } from 'vue';
import { bladeScopeToken } from '../tokens/index.js';

export function useBladeScope(): IAdminShellBladeScope {
  const scope = inject(bladeScopeToken);

  if (!scope) {
    throw new ReferenceError(
      `[PlatformSDK::useBladeScope] Blade scope is not supported`,
    );
  }

  return scope;
}
