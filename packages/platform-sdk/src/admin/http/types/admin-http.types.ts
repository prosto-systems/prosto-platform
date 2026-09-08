import type { z } from 'zod';
import type {
  acceptedResponseSchema,
  activityItemSchema,
  adminPermissionSchema,
  authSessionSchema,
  dashboardSummarySchema,
  loginRequestSchema,
  maintenanceRequestSchema,
  maintenanceResponseSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  platformHealthSchema,
  platformManifestSchema,
  platformModuleSchema,
  sanitizedAdminErrorSchema,
} from '../schemas/index.js';

/** @alpha A permission returned by the administration HTTP API. */
export type AdminPermissionType = z.output<typeof adminPermissionSchema>;

/** @alpha Credential input for an administration login. */
export type LoginRequestType = z.output<typeof loginRequestSchema>;

/** @alpha Input for requesting a password reset. */
export type PasswordResetRequestType = z.output<
  typeof passwordResetRequestSchema
>;

/** @alpha Input for completing a password reset. */
export type PasswordResetType = z.output<typeof passwordResetSchema>;

/** @alpha Authenticated administration session data. */
export type AuthSessionType = z.output<typeof authSessionSchema>;

/** @alpha Generic accepted administration operation response. */
export type AcceptedResponseType = z.output<typeof acceptedResponseSchema>;

/** @alpha Administration dashboard summary data. */
export type DashboardSummaryType = z.output<typeof dashboardSummarySchema>;

/** @alpha Sanitized platform module data shown in the dashboard. */
export type PlatformModuleType = z.output<typeof platformModuleSchema>;

/** @alpha Administration activity data. */
export type ActivityItemType = z.output<typeof activityItemSchema>;

/** @alpha Plugin manifest data consumed by the administration shell. */
export type PlatformManifestType = z.output<typeof platformManifestSchema>;

/** @alpha Protected platform-health data. */
export type PlatformHealthType = z.output<typeof platformHealthSchema>;

/** @alpha Input for changing shared maintenance mode. */
export type MaintenanceRequestType = z.output<typeof maintenanceRequestSchema>;

/** @alpha Shared maintenance-mode state. */
export type MaintenanceResponseType = z.output<
  typeof maintenanceResponseSchema
>;

/** @alpha Sanitized administration error data. */
export type SanitizedAdminErrorType = z.output<
  typeof sanitizedAdminErrorSchema
>;
