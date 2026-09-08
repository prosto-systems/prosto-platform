import {
  acceptedResponseSchema,
  activityItemSchema,
  adminPermissionSchema,
  authSessionSchema,
  dashboardSummarySchema,
  loginRequestSchema,
  maintenanceRequestSchema,
  platformHealthSchema,
  platformManifestSchema,
  sanitizedAdminErrorSchema,
  ADMIN_SHELL_RUNTIME_API_VERSION,
} from '@/admin/index.js';
import { describe, expect, it } from 'vitest';

const plugin = {
  moduleId: 'module-test',
  moduleVersion: '1.0.0',
  runtimeApiVersion: ADMIN_SHELL_RUNTIME_API_VERSION,
  entry: { type: 'script' as const, path: '/modules/module-test/admin.js' },
  contentFiles: [],
};

describe('admin HTTP contracts', () => {
  it('accepts valid administration DTOs', () => {
    expect(
      loginRequestSchema.safeParse({
        email: 'admin@example.com',
        password: 'password',
      }).success,
    ).toBe(true);
    expect(
      authSessionSchema.safeParse({
        csrfToken: 'csrf-token',
        permissions: ['dashboard:view'],
        principal: {
          displayName: 'Administrator',
          email: 'admin@example.com',
          id: 'user-1',
          role: 'admin',
        },
      }).success,
    ).toBe(true);
    expect(
      dashboardSummarySchema.safeParse({
        activeSessions: 1,
        healthyModules: 2,
        maintenanceEnabled: false,
        modules: 2,
      }).success,
    ).toBe(true);
    expect(
      activityItemSchema.safeParse({
        id: 'activity-1',
        message: 'Platform started.',
        severity: 'info',
        timestamp: '2026-09-07T07:41:01.000Z',
      }).success,
    ).toBe(true);
    expect(
      platformManifestSchema.safeParse({
        platformName: 'Prosto Platform',
        platformVersion: '1.0.0',
        plugins: [plugin],
      }).success,
    ).toBe(true);
    expect(
      platformHealthSchema.safeParse({
        services: [{ name: 'Persistence', status: 'healthy' }],
        status: 'healthy',
      }).success,
    ).toBe(true);
    expect(maintenanceRequestSchema.safeParse({ enabled: true }).success).toBe(
      true,
    );
    expect(acceptedResponseSchema.safeParse({ accepted: true }).success).toBe(
      true,
    );
  });

  it.each([
    [
      'extra login property',
      loginRequestSchema,
      { email: 'a@b.cd', password: 'x', extra: true },
    ],
    ['invalid permission', adminPermissionSchema, 'dashboard'],
    [
      'extra session principal property',
      authSessionSchema,
      {
        csrfToken: 'csrf-token',
        permissions: [],
        principal: {
          displayName: 'Administrator',
          email: 'admin@example.com',
          id: 'user-1',
          role: 'admin',
          secret: 'must-not-pass',
        },
      },
    ],
    [
      'invalid dashboard count',
      dashboardSummarySchema,
      {
        activeSessions: -1,
        healthyModules: 1,
        maintenanceEnabled: false,
        modules: 1,
      },
    ],
    [
      'error with exception details',
      sanitizedAdminErrorSchema,
      {
        code: 'internal_error',
        correlationId: 'request-1',
        stack: 'secret',
      },
    ],
  ])('strictly rejects %s', (_scenario, schema, value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });

  it('accepts a sanitized correlated administration error', () => {
    expect(
      sanitizedAdminErrorSchema.parse({
        code: 'validation_failed',
        correlationId: 'request-1',
        fieldErrors: { email: ['Enter a valid email address.'] },
      }),
    ).toEqual({
      code: 'validation_failed',
      correlationId: 'request-1',
      fieldErrors: { email: ['Enter a valid email address.'] },
    });
  });
});
