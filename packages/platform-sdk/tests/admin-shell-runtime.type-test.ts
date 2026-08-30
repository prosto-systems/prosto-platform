import type {
  IAdminShell,
  IAdminShellPlugin,
  IAdminShellRuntime,
} from '@/index.js';

declare const adminShell: IAdminShell;
declare const runtime: IAdminShellRuntime;
declare const pluginModule: IAdminShellPlugin;

const apiVersion: 1 = runtime.apiVersion;
const i18nNamespace: Readonly<Record<string, unknown>> = runtime.i18n;
const piniaNamespace: Readonly<Record<string, unknown>> = runtime.pinia;
const vueRouterNamespace: Readonly<Record<string, unknown>> = runtime.vueRouter;
const registration: Promise<IAdminShell> = adminShell.registerPlugin(
  'module-test',
  pluginModule.registerAdminPlugin,
);
const globalRuntime: IAdminShellRuntime | undefined =
  globalThis.__PROSTO_ADMIN_RUNTIME__;

void apiVersion;
void i18nNamespace;
void piniaNamespace;
void vueRouterNamespace;
void registration;
void globalRuntime;
