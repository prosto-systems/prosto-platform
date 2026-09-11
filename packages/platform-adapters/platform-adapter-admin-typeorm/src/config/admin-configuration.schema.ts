import { z } from 'zod';

const positiveIntegerSchema = z.number().int().positive();
const urlSchema = z
  .url()
  .refine((value) => new URL(value).protocol === 'https:', {
    message: 'URL must use HTTPS.',
  });

const bootstrapSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120),
    email: z.email().max(254),
    password: z.string().min(12).max(128),
  })
  .strict();

const rateLimitSchema = z
  .object({
    maxAttempts: positiveIntegerSchema.max(100),
    windowSeconds: positiveIntegerSchema.max(86_400),
  })
  .strict();

/** @internal Strict scoped configuration for the platform-admin adapter. */
export const adminConfigurationSchema = z
  .object({
    allowedPublicOrigin: urlSchema,
    bootstrap: bootstrapSchema.optional(),
    cookie: z
      .object({
        lifetimeSeconds: positiveIntegerSchema.max(86_400).default(3_600),
        name: z
          .string()
          .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/)
          .max(128),
        secure: z.boolean(),
      })
      .strict(),
    outbox: z
      .object({
        leaseSeconds: positiveIntegerSchema.max(3_600),
        maxAttempts: positiveIntegerSchema.max(20),
        retryBaseSeconds: positiveIntegerSchema.max(3_600),
      })
      .strict(),
    rateLimit: z
      .object({ login: rateLimitSchema, passwordReset: rateLimitSchema })
      .strict(),
    resetTokenEncryptionKey: z.string().min(40).max(512),
    resetUrlBase: urlSchema,
    restartPollingIntervalSeconds: positiveIntegerSchema.max(3_600),
    smtp: z
      .object({
        auth: z
          .object({ password: z.string().min(1), user: z.string().min(1) })
          .strict()
          .optional(),
        from: z.email(),
        host: z.string().trim().min(1).max(253),
        port: positiveIntegerSchema.max(65_535),
        secure: z.boolean(),
      })
      .strict(),
    trustedIngressConfigured: z.boolean().default(false),
  })
  .strict();

/** @internal Validated platform-admin adapter configuration. */
export type AdminConfigurationType = z.output<typeof adminConfigurationSchema>;

/** @internal Validates adapter configuration without retaining its raw input. */
export function parseAdminConfiguration(
  value: unknown,
  production: boolean,
): AdminConfigurationType {
  const configuration = adminConfigurationSchema.parse(value);

  if (
    production &&
    (!configuration.cookie.secure ||
      !configuration.smtp.secure ||
      !configuration.trustedIngressConfigured)
  ) {
    throw new Error(
      'platform-admin production configuration requires secure cookies, SMTPS, and trusted ingress.',
    );
  }

  return configuration;
}
