import {
  acceptedResponseSchema,
  activityItemSchema,
  type ActivityItemType,
  dashboardSummarySchema,
  type DashboardSummaryType,
  platformModuleSchema,
  type PlatformModuleType,
} from '@prosto/platform-sdk/admin';
import { csrfHeaders, httpClient } from '@/shared/api';

class DashboardApi {
  async getActivity(): Promise<readonly ActivityItemType[]> {
    return httpClient.request(`/api/admin/activity`, {
      responseSchema: activityItemSchema.array(),
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
}

export const dashboardApi = new DashboardApi();
