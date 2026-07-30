import type { PlatformStartupPolicyType } from '@prosto/platform-sdk';
import type { IConfigAccessPolicy } from '@/modularity/index.js';

/**
 * @alpha
 * Platform configuration interface.
 */
export interface IPlatformConfig extends Record<string, unknown> {
  platform: {
    name: string;
    version: string;
    /** @default process.cwd() */
    basePath: string;
    /** @default 'strict' */
    startupPolicy: PlatformStartupPolicyType;
  };
  runtime: {
    /** @default 60 seconds for production, 30 seconds for development */
    shutdownTimeoutMs: number;
    correlationId?: string;
  };
  modules: {
    [key: string]: unknown;
    configAccessPolicy: IConfigAccessPolicy;
    artifactCache: {
      /** @default true – for production, false – for development */
      enabled: boolean;
      /** @default .cache/module-artifacts */
      path?: string;
      /** @default 14 days */
      maxAgeMs?: number;
      /** @default 500MB */
      maxSizeBytes?: number;
    };
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
       * @default ['password', 'token', 'secret', 'key', 'apiKey', 'passphrase']
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
