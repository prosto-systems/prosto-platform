import { z } from 'zod';

export const dashboardSummarySchema = z.object({
  activeSessions: z.number().int().nonnegative(),
  healthyModules: z.number().int().nonnegative(),
  maintenanceEnabled: z.boolean(),
  modules: z.number().int().nonnegative(),
});

export const platformModuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['healthy', 'degraded']),
  version: z.string().min(1),
});

export const activityItemSchema = z.object({
  id: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(['info', 'warning']),
  timestamp: z.string().datetime(),
});

export const acceptedResponseSchema = z.object({ accepted: z.literal(true) });

export type DashboardSummaryType = z.infer<typeof dashboardSummarySchema>;
export type PlatformModuleType = z.infer<typeof platformModuleSchema>;
export type ActivityItemType = z.infer<typeof activityItemSchema>;
