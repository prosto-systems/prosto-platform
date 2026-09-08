import { z } from 'zod';
import { adminShellPluginInfosSchema } from '../../schemas/index.js';

/** @alpha Validates a generic accepted administration operation response. */
export const acceptedResponseSchema = z
  .object({ accepted: z.literal(true) })
  .strict();

/** @alpha Alias for password-reset operations that deliberately reveal no account state. */
export const resetRequestAcceptedSchema = acceptedResponseSchema;

/** @alpha Validates the administration shell plugin manifest response. */
export const platformManifestSchema = z
  .object({
    platformName: z.string().min(1),
    platformVersion: z.string().min(1),
    plugins: adminShellPluginInfosSchema,
  })
  .strict();

/** @alpha Validates an aggregate platform-health service signal. */
export const platformHealthServiceSchema = z
  .object({
    name: z.string().min(1),
    status: z.enum(['healthy', 'degraded', 'maintenance']),
  })
  .strict();

/** @alpha Validates the protected platform-health response. */
export const platformHealthSchema = z
  .object({
    services: z.array(platformHealthServiceSchema),
    status: z.enum(['healthy', 'degraded', 'maintenance']),
  })
  .strict();

/** @alpha Validates a maintenance-mode update request. */
export const maintenanceRequestSchema = z
  .object({ enabled: z.boolean() })
  .strict();

/** @alpha Validates the resulting shared maintenance-mode state. */
export const maintenanceResponseSchema = maintenanceRequestSchema;
