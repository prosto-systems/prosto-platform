import { z } from 'zod';

const passwordSchema = z.string().min(8).max(128);

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const passwordResetRequestSchema = z.object({
  email: z.email(),
});

export const passwordResetSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string(),
    token: z.string().min(1),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Passwords do not match.',
    path: ['passwordConfirmation'],
  });

const permissionSchema = z.string().regex(/^[^:\s]+:[^:\s]+$/);

export const authSessionSchema = z.object({
  csrfToken: z.string().min(1),
  permissions: z.array(permissionSchema),
  principal: z.object({
    displayName: z.string().min(1),
    email: z.string().email(),
    id: z.string().min(1),
    role: z.enum(['admin', 'operator', 'viewer']),
  }),
});

export const resetRequestAcceptedSchema = z.object({
  accepted: z.literal(true),
});

export type AuthSessionType = z.infer<typeof authSessionSchema>;
export type LoginRequestType = z.infer<typeof loginRequestSchema>;
export type PasswordResetRequestType = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetType = z.infer<typeof passwordResetSchema>;
