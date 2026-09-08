import type { IAdminShellBlade } from '@prosto/platform-sdk/admin';

export function getParentBlades(blade: IAdminShellBlade): IAdminShellBlade[] {
  return blade.parentBlade
    ? [blade.parentBlade, ...getParentBlades(blade.parentBlade)]
    : [];
}
