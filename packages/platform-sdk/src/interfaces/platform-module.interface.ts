import type { ModuleLifecycleResultType } from '../types/index.js';
import type { IModuleContext } from './module-context.interface.js';
import type {
  IPlatformModuleManifest
} from './platform-module-manifest.interface.js';

/**
 * @stable
 * Canonical runtime module contract implemented by platform plugins.
 */
export interface IPlatformModule {
  readonly manifest: IPlatformModuleManifest;
  register(ctx: IModuleContext): ModuleLifecycleResultType;
  init(ctx: IModuleContext): ModuleLifecycleResultType;
  start(ctx: IModuleContext): ModuleLifecycleResultType;
  stop(ctx: IModuleContext): ModuleLifecycleResultType;
}
