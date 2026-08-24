import type {
  AdminShellPluginContentFileType,
  IAdminShellPluginContentFile,
  IAdminShellPluginInfo,
} from '@prosto/platform-sdk';

export function getUrlWithCache(file: IAdminShellPluginContentFile) {
  return file.hash
    ? `${file.path}?v=${encodeURIComponent(file.hash)}`
    : file.path;
}

export function injectStyle(file: IAdminShellPluginContentFile) {
  const href = getUrlWithCache(file);

  if (!href) return;

  const link = document.createElement('link');

  link.rel = 'stylesheet';
  link.href = href;

  document.head.appendChild(link);
}

export function injectScript(file: IAdminShellPluginContentFile) {
  return new Promise<void>(function (resolve) {
    const src = getUrlWithCache(file);

    if (!src) {
      resolve();
      return;
    }

    const script = document.createElement('script');

    // async=false on dynamically-created scripts preserves execution order
    // when multiple are appended in sequence (ES spec / WHATWG).
    script.async = false;
    script.src = src;
    script.type = 'text/javascript';
    script.onload = () => resolve();
    script.onerror = () => {
      // Don't block remaining plugins — log and continue.
      console.error('[AdminShell::injectScript] failed to load script:', src);
      resolve();
    };

    document.head.appendChild(script);
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
