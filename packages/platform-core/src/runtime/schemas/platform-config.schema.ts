import pkg from '../../../package.json' with { type: 'json' };
import type { ZodType } from 'zod';
import type { IPlatformConfig } from '../interfaces/index.js';
import { z } from 'zod';

const adapterLocalOverrideSchema = z
  .object({
    // Adapter implementations validate their own scoped configuration. Local
    // overrides may therefore provide secrets without exposing them to modules.
    adapters: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/**
 * @alpha
 * Validates the deployment-local secret override without allowing it to alter
 * unrelated runtime settings.
 */
export const platformLocalAdapterConfigSchema = adapterLocalOverrideSchema;

/**
 * @alpha
 * Validates and supplies defaults for the complete platform configuration,
 * including module discovery, probing refresh, and adapter-scoped settings.
 */
export const platformConfigSchema: ZodType<IPlatformConfig> = z.object({
  platform: z
    .object({
      name: z.string().default('Prosto Platform'),
      version: z.string().default(pkg.version),
      basePath: z.string().default(process.cwd()),
      discoveryPath: z.string().default('./modules'),
      probingPath: z.string().default('app_data/modules'),
      refreshProbingFolderOnStart: z.boolean().default(false),
      startupPolicy: z.literal(['strict', 'best-effort']).default('strict'),
    })
    .default({
      name: 'Prosto Platform',
      version: pkg.version,
      basePath: process.cwd(),
      discoveryPath: './modules',
      probingPath: 'app_data/modules',
      refreshProbingFolderOnStart: false,
      startupPolicy: 'strict',
    }),
  runtime: z
    .object({
      shutdownTimeoutMs: z.number().positive().default(30000),
      correlationId: z.string().optional(),
    })
    .default({
      shutdownTimeoutMs: 30000,
    }),
  adapters: z.record(z.string(), z.unknown()).default({}),
  modules: z
    .object({
      configAccessPolicy: z
        .object({
          productionStrictMode: z.boolean().default(true),
        })
        .default({
          productionStrictMode: true,
        }),
    })
    // Module identifiers are deployment-owned keys, including kebab-case IDs.
    .catchall(z.unknown())
    .default({
      configAccessPolicy: {
        productionStrictMode: true,
      },
    }),
  security: z
    .object({
      secretRedaction: z
        .object({
          enabled: z.boolean().default(true),
          patterns: z
            .array(z.string())
            .default([
              'key',
              'token',
              'secret',
              'password',
              'passphrase',
              'url',
              'connectionString',
            ]),
        })
        .default({
          enabled: true,
          patterns: [
            'key',
            'token',
            'secret',
            'password',
            'passphrase',
            'url',
            'connectionString',
          ],
        }),
    })
    .default({
      secretRedaction: {
        enabled: true,
        patterns: [
          'key',
          'token',
          'secret',
          'password',
          'passphrase',
          'url',
          'connectionString',
        ],
      },
    }),
  logging: z
    .object({
      level: z.string().default('info'),
      format: z.string().default('text'),
    })
    .default({
      level: 'info',
      format: 'text',
    }),
  custom: z.record(z.string(), z.unknown()).default({}),
});
