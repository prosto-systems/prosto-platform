import type {
  ActivityItemType,
  DashboardSummaryType,
  PlatformHealthType,
  PlatformModuleType,
} from '../models';
import {
  acceptedResponseSchema,
  activityItemSchema,
  dashboardSummarySchema,
  maintenanceResponseSchema,
  platformHealthSchema,
  platformModuleSchema,
} from '../models';
import { httpClient, csrfHeaders } from '@/shared/api';

class DashboardApi {
  async getActivity(): Promise<readonly ActivityItemType[]> {
    return httpClient.request(`/api/admin/activity`, {
      responseSchema: activityItemSchema.array(),
    });
  }

  async getHealth(): Promise<PlatformHealthType> {
    return httpClient.request(`/api/admin/platform/health`, {
      responseSchema: platformHealthSchema,
    });
  }

  async getModules(): Promise<readonly PlatformModuleType[]> {
    return httpClient.request(`/api/admin/modules`, {
      responseSchema: platformModuleSchema.array(),
    });
  }

  async getSummary(): Promise<DashboardSummaryType> {
    return httpClient.request(`/api/admin/dashboard`, {
      responseSchema: dashboardSummarySchema,
    });
  }

  async restartModule(moduleId: string, csrfToken: string): Promise<void> {
    return httpClient
      .request(`/api/admin/modules/${moduleId}/restart`, {
        headers: csrfHeaders(csrfToken),
        method: 'POST',
        responseSchema: acceptedResponseSchema,
      })
      .then(() => undefined);
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

export const dashboardApi = new DashboardApi();
