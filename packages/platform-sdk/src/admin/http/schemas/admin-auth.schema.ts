import { z } from 'zod';

/** @alpha Validates a namespaced administration permission identifier. */
export const adminPermissionSchema = z.string().regex(/^[^:\s]+:[^:\s]+$/);

const passwordSchema = z.string().min(8).max(128);

/** @alpha Validates credential input submitted to the administration login endpoint. */
export const loginRequestSchema = z
  .object({
    email: z.email(),
    password: z.string().min(1),
  })
  .strict();

/** @alpha Validates a password-reset request without exposing account existence. */
export const passwordResetRequestSchema = z
  .object({
    email: z.email(),
  })
  .strict();

/** @alpha Validates completion input for a one-use password-reset token. */
export const passwordResetSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string(),
    token: z.string().min(1),
  })
  .strict()
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Passwords do not match.',
    path: ['passwordConfirmation'],
  });

/** @alpha Validates the authenticated administration-session projection. */
export const authSessionSchema = z
  .object({
    csrfToken: z.string().min(1),
    permissions: z.array(adminPermissionSchema),
    principal: z
      .object({
        displayName: z.string().min(1),
        email: z.email(),
        id: z.string().min(1),
        role: z.enum(['admin', 'operator', 'viewer']),
      })
      .strict(),
  })
  .strict();
