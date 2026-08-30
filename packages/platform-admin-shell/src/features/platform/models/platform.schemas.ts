import { z } from 'zod';
import { adminShellPluginInfosSchema } from '@prosto/platform-sdk';

export const platformManifestSchema = z.object({
  platformName: z.string().min(1),
  platformVersion: z.string().min(1),
  plugins: adminShellPluginInfosSchema,
});

export const platformHealthSchema = z.object({
  services: z.array(
    z.object({
      name: z.string().min(1),
      status: z.enum(['healthy', 'degraded', 'maintenance']),
    }),
  ),
  status: z.enum(['healthy', 'degraded', 'maintenance']),
});

export const acceptedResponseSchema = z.object({ accepted: z.literal(true) });

export const maintenanceResponseSchema = z.object({ enabled: z.boolean() });

export type PlatformManifestType = z.infer<typeof platformManifestSchema>;
export type PlatformHealthType = z.infer<typeof platformHealthSchema>;
