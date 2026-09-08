import type { AuthSessionType } from '@prosto/platform-sdk/admin';
import { describe, expect, it } from 'vitest';

const API_URL = 'http://127.0.0.1:3001/api/admin';

async function login(
  email: string,
  password: string,
): Promise<AuthSessionType> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
  });

  return (await response.json()) as AuthSessionType;
}

describe('MSW dashboard handlers', () => {
  it('serves the manifest to an authorized session without a CSRF header', async () => {
    const viewer = await login('viewer@prosto.test', 'Viewer123!');
    const response = await fetch(`${API_URL}/platform/manifest`);

    expect(viewer.permissions).toContain('modules:view');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      plugins: [{ moduleId: 'module-test' }],
    });
  });

  it('updates maintenance state only for an authorized CSRF-protected request', async () => {
    const admin = await login('admin@prosto.test', 'Admin123!');
    const response = await fetch(`${API_URL}/platform/maintenance`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': admin.csrfToken,
      },
      body: JSON.stringify({ enabled: true }),
    });
    const dashboard = await fetch(`${API_URL}/dashboard`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ enabled: true });
    await expect(dashboard.json()).resolves.toMatchObject({
      maintenanceEnabled: true,
    });
  });
});
