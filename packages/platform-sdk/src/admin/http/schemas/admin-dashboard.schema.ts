import { z } from 'zod';

/** @alpha Validates the dashboard summary returned to an administrator. */
export const dashboardSummarySchema = z
  .object({
    activeSessions: z.number().int().nonnegative(),
    healthyModules: z.number().int().nonnegative(),
    maintenanceEnabled: z.boolean(),
    modules: z.number().int().nonnegative(),
  })
  .strict();

/** @alpha Validates a sanitized platform-module summary for the dashboard. */
export const platformModuleSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    status: z.enum(['healthy', 'degraded']),
    version: z.string().min(1),
  })
  .strict();

/** @alpha Validates a sanitized administration activity item. */
export const activityItemSchema = z
  .object({
    id: z.string().min(1),
    message: z.string().min(1),
    severity: z.enum(['info', 'warning']),
    timestamp: z.string().datetime(),
  })
  .strict();
