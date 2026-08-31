import type { IAdminShellBlade } from '@prosto/platform-sdk';

export function getParentBlades(blade: IAdminShellBlade): IAdminShellBlade[] {
  return blade.parentBlade
    ? [blade.parentBlade, ...getParentBlades(blade.parentBlade)]
    : [];
}
