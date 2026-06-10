import type { RouteRecordRaw } from 'vue-router';
import DashboardPage from '@/pages/dashboard/ui/dashboard-page.vue';
import DiagnosticsPage from '@/pages/diagnostics/ui/diagnostics-page.vue';

export const routes: readonly RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardPage,
  },
  {
    path: '/diagnostics',
    name: 'diagnostics',
    component: DiagnosticsPage,
  },
];
