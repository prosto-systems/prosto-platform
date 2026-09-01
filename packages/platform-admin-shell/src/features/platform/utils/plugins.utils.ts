import {
  ADMIN_SHELL_GLOBAL,
  ADMIN_SHELL_RUNTIME_API_VERSION,
  ADMIN_SHELL_RUNTIME_GLOBAL,
  type AdminShellPluginContentFileType,
  type IAdminShellPluginContentFile,
  type IAdminShellPluginInfo,
  isAdminShellPluginModule,
} from '@prosto/platform-sdk';
import {
  type IPluginLoadResult,
  type PluginLoadFailureCodeType,
} from '../models';

export const PLUGIN_ASSET_PREFIX = '/modules/';
export const PLUGIN_ASSET_LOAD_TIMEOUT_MS = 10_000;

export class PluginAssetUrlError extends Error {
  constructor() {
    super('Admin plugin asset URL is not allowed.');
    this.name = 'PluginAssetUrlError';
  }
}

export class PluginImportTimeoutError extends Error {
  constructor() {
    super('Admin plugin entry import timed out.');
    this.name = 'PluginImportTimeoutError';
  }
}

export function resolvePluginAssetUrl(file: IAdminShellPluginContentFile): URL {
  const url = new URL(file.path, window.location.origin);

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.origin !== window.location.origin ||
    url.username ||
    url.password ||
    !url.pathname.startsWith(PLUGIN_ASSET_PREFIX)
  ) {
    throw new PluginAssetUrlError();
  }

  if (file.hash) {
    url.searchParams.set('v', file.hash);
  }

  return url;
}

export function removeLink(link: HTMLLinkElement): void {
  link.remove();
}

export function loadPluginStyle(
  url: URL,
  moduleId: string,
  timeoutMs = PLUGIN_ASSET_LOAD_TIMEOUT_MS,
): Promise<HTMLLinkElement> {
  const link = document.createElement('link');

  link.rel = 'stylesheet';
  link.href = url.href;
  link.dataset.moduleId = moduleId;

  return new Promise<HTMLLinkElement>((resolve, reject) => {
    const timeout = setTimeout(() => {
      removeLink(link);
      reject(new Error('Admin plugin stylesheet load timed out.'));
    }, timeoutMs);

    link.onload = () => {
      clearTimeout(timeout);
      resolve(link);
    };
    link.onerror = () => {
      clearTimeout(timeout);
      removeLink(link);
      reject(new Error('Admin plugin stylesheet failed to load.'));
    };

    document.head.appendChild(link);
  });
}

export function importPluginEntry(
  url: URL,
  timeoutMs = PLUGIN_ASSET_LOAD_TIMEOUT_MS,
): Promise<unknown> {
  const module = import(/* @vite-ignore */ url.href);

  return new Promise<unknown>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new PluginImportTimeoutError());
    }, timeoutMs);

    module.then(
      (namespace) => {
        clearTimeout(timeout);
        resolve(namespace);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function collectFilesByType(
  plugin: IAdminShellPluginInfo,
  type: AdminShellPluginContentFileType,
) {
  const result: IAdminShellPluginContentFile[] = [];

  if (plugin.entry.type === type) {
    result.push(plugin.entry);
  }

  (plugin.contentFiles || []).forEach((contentFile) => {
    if (contentFile.type === type) {
      result.push(contentFile);
    }
  });

  return result;
}

export function createPluginLoadResult(
  plugin: IAdminShellPluginInfo,
  status: IPluginLoadResult['status'],
  code?: PluginLoadFailureCodeType,
): IPluginLoadResult {
  return {
    moduleId: plugin.moduleId,
    moduleVersion: plugin.moduleVersion,
    status,
    ...(code ? { code } : {}),
  };
}

export function logPluginLoadFailure(
  plugin: IAdminShellPluginInfo,
  code: PluginLoadFailureCodeType,
  cause: unknown,
): void {
  console.error('[AdminShell::pluginLoader]', {
    moduleId: plugin.moduleId,
    moduleVersion: plugin.moduleVersion,
    code,
    cause,
  });
}

export function getFailureCode(error: unknown): PluginLoadFailureCodeType {
  if (error instanceof PluginAssetUrlError) {
    return 'asset_url_rejected';
  }

  if (error instanceof PluginImportTimeoutError) {
    return 'entry_timeout';
  }

  return 'entry_import_failed';
}

export function isDuplicateRegistrationError(error: unknown): boolean {
  return (
    error instanceof Error && error.name === 'AdminPluginAlreadyRegisteredError'
  );
}

export async function loadPlugin(
  plugin: IAdminShellPluginInfo,
): Promise<IPluginLoadResult> {
  if (
    plugin.runtimeApiVersion !== ADMIN_SHELL_RUNTIME_API_VERSION ||
    globalThis[ADMIN_SHELL_RUNTIME_GLOBAL]?.apiVersion !==
      ADMIN_SHELL_RUNTIME_API_VERSION
  ) {
    logPluginLoadFailure(
      plugin,
      'runtime_incompatible',
      new Error('Admin plugin runtime ABI is incompatible.'),
    );

    return createPluginLoadResult(plugin, 'failed', 'runtime_incompatible');
  }

  let entryUrl: URL;
  let styleUrls: URL[];

  try {
    entryUrl = resolvePluginAssetUrl(plugin.entry);
    styleUrls = collectFilesByType(plugin, 'style').map(resolvePluginAssetUrl);
  } catch (error) {
    logPluginLoadFailure(plugin, 'asset_url_rejected', error);
    return createPluginLoadResult(plugin, 'failed', 'asset_url_rejected');
  }

  const loadedStyles: HTMLLinkElement[] = [];

  try {
    for (const url of styleUrls) {
      loadedStyles.push(await loadPluginStyle(url, plugin.moduleId));
    }
  } catch (error) {
    loadedStyles.forEach((link) => link.remove());
    logPluginLoadFailure(plugin, 'style_load_failed', error);

    return createPluginLoadResult(plugin, 'failed', 'style_load_failed');
  }

  let namespace: unknown;

  try {
    namespace = await importPluginEntry(entryUrl);
  } catch (error) {
    const code = getFailureCode(error);

    logPluginLoadFailure(plugin, code, error);

    return createPluginLoadResult(plugin, 'failed', code);
  }

  if (!isAdminShellPluginModule(namespace)) {
    const error = new Error(
      'Admin plugin entry has an invalid ESM export shape.',
    );

    logPluginLoadFailure(plugin, 'invalid_entry', error);

    return createPluginLoadResult(plugin, 'failed', 'invalid_entry');
  }

  try {
    await globalThis[ADMIN_SHELL_GLOBAL].registerPlugin(
      plugin.moduleId,
      namespace.registerAdminPlugin,
    );
  } catch (error) {
    const code = isDuplicateRegistrationError(error)
      ? 'duplicate_plugin'
      : 'registration_failed';

    logPluginLoadFailure(plugin, code, error);

    return createPluginLoadResult(plugin, 'failed', code);
  }

  return createPluginLoadResult(plugin, 'loaded');
}
