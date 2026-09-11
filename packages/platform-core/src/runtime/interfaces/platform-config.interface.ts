import type { PlatformStartupPolicyType } from '@prosto/platform-sdk/platform';
import type { IConfigAccessPolicy } from '@/modularity/index.js';

/**
 * @alpha
 * Platform configuration interface.
 */
export interface IPlatformConfig extends Record<string, unknown> {
  platform: {
    name: string;
    version: string;
    /** Informational application base path. @default process.cwd() */
    basePath: string;
    /** Local package tree recursively scanned for manifests. @default './modules' */
    discoveryPath: string;
    /** Runtime package cache used for ESM imports. @default 'app_data/modules' */
    probingPath: string;
    /** Copy validated builds into the probing directory on every startup. @default false */
    refreshProbingFolderOnStart: boolean;
    /** @default 'strict' */
    startupPolicy: PlatformStartupPolicyType;
  };
  runtime: {
    /** @default 60 seconds for production, 30 seconds for development */
    shutdownTimeoutMs: number;
    correlationId?: string;
  };
  adapters: Record<string, unknown>;
  modules: {
    [key: string]: unknown;
    configAccessPolicy: IConfigAccessPolicy;
  };
  security: {
    secretRedaction: {
      /**
       * Whether redaction is active.
       * @default true
       */
      enabled: boolean;
      /**
       * Key names to redact in `key=value` patterns.
       * @default ['password', 'token', 'secret', 'key', 'apiKey', 'passphrase', 'url', 'connectionString']
       */
      patterns: string[];
    };
  };
  logging: {
    /** @default 'info' */
    level: string;
    /** @default 'text' */
    format: string;
  };
  custom: Record<string, unknown>;
}
