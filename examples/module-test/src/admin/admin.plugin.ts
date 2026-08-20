import { id } from '../../manifest.json';

(function (global) {
  const PLATFORM_MODULE_ID = id;
  const adminShell = global.adminShell;

  if (!adminShell) {
    throw new ReferenceError(
      `Plugin ${PLATFORM_MODULE_ID}: 'adminShell' is not supported`,
    );
  }

  adminShell.registerPlugin(PLATFORM_MODULE_ID, () => {
    console.log(`Plugin ${PLATFORM_MODULE_ID} registered`);
  });
})(globalThis);
