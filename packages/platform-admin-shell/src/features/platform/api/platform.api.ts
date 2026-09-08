import {
  acceptedResponseSchema,
  maintenanceResponseSchema,
  platformHealthSchema,
  type PlatformHealthType,
  platformManifestSchema,
  type PlatformManifestType,
} from '@prosto/platform-sdk/admin';
import { csrfHeaders, httpClient } from '@/shared/api';

class PlatformApi {
  async getManifest(): Promise<PlatformManifestType> {
    return httpClient.request(`/api/admin/platform/manifest`, {
      responseSchema: platformManifestSchema,
    });
  }

  async getHealth(): Promise<PlatformHealthType> {
    return httpClient.request(`/api/admin/platform/health`, {
      responseSchema: platformHealthSchema,
    });
  }

  async restartPlatform(csrfToken: string): Promise<void> {
    return httpClient
      .request(`/api/admin/platform/restart`, {
        headers: csrfHeaders(csrfToken),
        method: 'POST',
        responseSchema: acceptedResponseSchema,
      })
      .then(() => undefined);
  }

  async setMaintenance(enabled: boolean, csrfToken: string): Promise<boolean> {
    return httpClient
      .request(`/api/admin/platform/maintenance`, {
        body: { enabled },
        headers: csrfHeaders(csrfToken),
        method: 'PATCH',
        responseSchema: maintenanceResponseSchema,
      })
      .then((response) => response.enabled);
  }
}

export const platformApi = new PlatformApi();
