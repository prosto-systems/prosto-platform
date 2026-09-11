import pkg from '../../package.json' with { type: 'json' };

export * from './administration/index.js';
export * from './adapters/index.js';
export * from './errors/index.js';
export * from './events/index.js';
export * from './http/index.js';
export * from './modularity/index.js';
export * from './persistence/index.js';
export * from './security/index.js';
export * from './services/index.js';

/**
 * @alpha
 * SDK contract surface baseline identifier.
 */
export const SDK_CONTRACT_VERSION = pkg.version;
