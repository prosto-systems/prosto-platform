import pkg from '../package.json' with { type: 'json' };

export * from './admin/index.js';
export * from './platform/index.js';
export * from './utils/index.js';

/**
 * @alpha
 * SDK contract surface baseline identifier.
 */
export const SDK_CONTRACT_VERSION = pkg.version;
