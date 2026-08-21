import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api';
import { server } from '@/mocks/server';
import { dashboardApi } from './dashboard.api';

describe('dashboardApi', () => {
  it('loads dashboard resources and sends the session CSRF token for mutations', async () => {
    let csrfHeader: string | null = null;

    server.use(
      http.get('*/api/admin/dashboard', () =>
        HttpResponse.json({
          activeSessions: 2,
          healthyModules: 2,
          maintenanceEnabled: false,
          modules: 2,
        }),
      ),
      http.patch('*/api/admin/platform/maintenance', ({ request }) => {
        csrfHeader = request.headers.get('X-CSRF-Token');
        return HttpResponse.json({ enabled: true });
      }),
    );

    const summary = await dashboardApi.getSummary();
    const maintenanceEnabled = await dashboardApi.setMaintenance(
      true,
      'csrf-token',
    );

    expect(summary).toMatchObject({ maintenanceEnabled: false, modules: 2 });
    expect(maintenanceEnabled).toBe(true);
    expect(csrfHeader).toBe('csrf-token');
  });

  it('rejects a malformed successful response', async () => {
    server.use(
      http.get('*/api/admin/dashboard', () =>
        HttpResponse.json({ unexpected: true }),
      ),
    );

    await expect(dashboardApi.getSummary()).rejects.toMatchObject(
      new ApiError({ code: 'invalid_response', status: 200 }),
    );
  });
});
