import { isAbsolute } from 'node:path';
import { z } from 'zod';
import {
  DEFAULT_MULTIPART_LIMITS,
  MEBIBYTE,
  NODE_TIMER_MAXIMUM_MS,
} from '@/constants/index.js';
import { isTrustedProxyDefinition } from '@/trusted-proxy/trusted-proxy.matcher.js';

export const positiveSafeIntegerSchema = z.number().int().safe().positive();
export const timeoutSchema = positiveSafeIntegerSchema.max(
  NODE_TIMER_MAXIMUM_MS,
);

export const httpAdapterOptionsSchema = z.object({
  host: z.string().trim().min(1).max(255).default('127.0.0.1'),
  port: z.number().int().safe().min(0).max(65_535).default(0),
  parsedBodyLimitBytes: positiveSafeIntegerSchema.default(MEBIBYTE),
  rawBodyLimitBytes: positiveSafeIntegerSchema.default(MEBIBYTE),
  multipartLimits: z
    .object({
      fileSizeBytes: positiveSafeIntegerSchema.default(
        DEFAULT_MULTIPART_LIMITS.fileSizeBytes,
      ),
      files: positiveSafeIntegerSchema.default(DEFAULT_MULTIPART_LIMITS.files),
      fields: positiveSafeIntegerSchema.default(
        DEFAULT_MULTIPART_LIMITS.fields,
      ),
      parts: positiveSafeIntegerSchema.default(DEFAULT_MULTIPART_LIMITS.parts),
      fieldSizeBytes: positiveSafeIntegerSchema.default(
        DEFAULT_MULTIPART_LIMITS.fieldSizeBytes,
      ),
      fieldNameSizeBytes: positiveSafeIntegerSchema.default(
        DEFAULT_MULTIPART_LIMITS.fieldNameSizeBytes,
      ),
      headerPairs: positiveSafeIntegerSchema.default(
        DEFAULT_MULTIPART_LIMITS.headerPairs,
      ),
      totalSizeBytes: positiveSafeIntegerSchema.default(
        DEFAULT_MULTIPART_LIMITS.totalSizeBytes,
      ),
    })
    .default(DEFAULT_MULTIPART_LIMITS),
  requestTimeoutMs: timeoutSchema.default(120_000),
  handlerTimeoutMs: timeoutSchema.default(30_000),
  keepAliveTimeoutMs: timeoutSchema.default(5_000),
  shutdownTimeoutMs: timeoutSchema.default(30_000),
  trustedProxies: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(255)
        .refine(
          isTrustedProxyDefinition,
          'Expected an IP address or CIDR range.',
        ),
    )
    .max(32)
    .default([]),
  tls: z
    .object({
      certificatePath: z
        .string()
        .trim()
        .min(1)
        .refine(isAbsolute, 'Expected an absolute certificate path.'),
      privateKeyPath: z
        .string()
        .trim()
        .min(1)
        .refine(isAbsolute, 'Expected an absolute private-key path.'),
    })
    .strict()
    .optional(),
  staticSite: z
    .object({
      rootPath: z
        .string()
        .trim()
        .min(1)
        .refine(isAbsolute, 'Expected an absolute path.'),
      indexFileName: z
        .string()
        .trim()
        .min(1)
        .max(255)
        .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.html$/u)
        .default('index.html'),
      spaFallback: z.boolean().default(true),
      contentSecurityPolicy: z
        .string()
        .trim()
        .min(1)
        .max(4096)
        .or(z.literal(false))
        .default(
          "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src 'self'; font-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
        ),
    })
    .optional(),
});

export type FastifyHttpAdapterConfigurationType = z.output<
  typeof httpAdapterOptionsSchema
>;
