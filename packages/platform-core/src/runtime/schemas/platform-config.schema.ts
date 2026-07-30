import pkg from '../../../package.json' with { type: 'json' };
import type { ZodType } from 'zod';
import type { IPlatformConfig } from '../interfaces/index.js';
import { z } from 'zod';

export const platformConfigSchema: ZodType<IPlatformConfig> = z.object({
  platform: z
    .object({
      name: z.string().default('Prosto Platform'),
      version: z.string().default(pkg.version),
      basePath: z.string().default(process.cwd()),
      startupPolicy: z.literal(['strict', 'best-effort']).default('strict'),
    })
    .default({
      name: 'Prosto Platform',
      version: pkg.version,
      basePath: process.cwd(),
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
  modules: z
    .object({
      configAccessPolicy: z
        .object({
          productionStrictMode: z.boolean().default(true),
        })
        .default({
          productionStrictMode: true,
        }),
      artifactCache: z
        .object({
          enabled: z.boolean().default(false),
          path: z.string().optional(),
          maxAgeMs: z.number().positive().optional(),
          maxSizeBytes: z.number().positive().optional(),
        })
        .default({
          enabled: false,
        }),
    })
    .default({
      configAccessPolicy: {
        productionStrictMode: true,
      },
      artifactCache: {
        enabled: false,
      },
    }),
  security: z
    .object({
      secretRedaction: z
        .object({
          enabled: z.boolean().default(true),
          patterns: z
            .array(z.string())
            .default(['key', 'token', 'secret', 'password', 'passphrase']),
        })
        .default({
          enabled: true,
          patterns: ['key', 'token', 'secret', 'password', 'passphrase'],
        }),
    })
    .default({
      secretRedaction: {
        enabled: true,
        patterns: ['key', 'token', 'secret', 'password', 'passphrase'],
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
