import { z } from 'zod';

/** @alpha Validates a sanitized, field-specific administration validation error. */
export const adminFieldErrorsSchema = z.record(
  z.string().min(1),
  z.array(z.string().min(1)),
);

/**
 * @alpha
 * Validates the public administration error envelope. Implementations must not
 * include exception details, secrets, or persistence diagnostics.
 */
export const sanitizedAdminErrorSchema = z
  .object({
    code: z.string().regex(/^[a-z][a-z0-9_]*$/),
    correlationId: z.string().min(1),
    fieldErrors: adminFieldErrorsSchema.optional(),
  })
  .strict();
