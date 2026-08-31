import type { InjectionKey } from 'vue';
import type { IAdminShellBladeScope } from '../interfaces/index.js';

export const bladeScopeToken = Symbol.for(
  'blade-scope',
) as InjectionKey<IAdminShellBladeScope>;
