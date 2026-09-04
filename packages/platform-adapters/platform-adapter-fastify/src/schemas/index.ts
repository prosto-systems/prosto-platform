import { z } from 'zod';
import {
  DEFAULT_MULTIPART_LIMITS,
  MEBIBYTE,
  NODE_TIMER_MAXIMUM_MS,
} from '@/constants/index.js';

export const positiveSafeIntegerSchema = z.number().int().safe().positive();
export const timeoutSchema = positiveSafeIntegerSchema.max(
  NODE_TIMER_MAXIMUM_MS,
);

export const applicationOptionsSchema = z.object({
  runtimeFactory: z.unknown(),
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
  trustProxy: z.boolean().default(false),
  logger: z.unknown().optional(),
});

export type FastifyHttpApplicationConfigurationType = z.output<
  typeof applicationOptionsSchema
>;
