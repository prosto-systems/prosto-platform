import type { AdminShellPermissionType } from '@prosto/platform-sdk';
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router';
import { pinia } from '@/app/plugins/pinia';
import {
  ForbiddenPage,
  ForgotPasswordPage,
  LoginPage,
  NotFoundPage,
  ResetPasswordPage,
  useAuthStore,
} from '@/features/auth';
import { httpClient } from '@/shared/api';
import { getSafeReturnUrl } from './safe-return-url';

declare module 'vue-router' {
  interface RouteMeta {
    readonly title?: string;
    readonly guestOnly?: boolean;
    readonly requiresAuth?: boolean;
    readonly permission?: AdminShellPermissionType;
  }
}

const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { guestOnly: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPasswordPage,
    meta: { guestOnly: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPasswordPage,
    meta: { guestOnly: true },
  },
];

/** Not modify */
const errorRoutes: RouteRecordRaw[] = [
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundPage,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'Forbidden',
    component: ForbiddenPage,
    meta: { requiresAuth: true },
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('@/features/dashboard/pages/dashboard-page.vue'),
      meta: {
        title: 'navigation.dashboard',
        requiresAuth: true,
        permission: 'dashboard:view',
      },
    },
    ...authRoutes,
    /* Error pages should always be the last one */
    ...errorRoutes,
  ],
});

httpClient.setUnauthorizedHandler(async () => {
  const authStore = useAuthStore(pinia);

  authStore.invalidate();

  const currentRoute = router.currentRoute.value;

  if (currentRoute.meta.guestOnly) {
    return;
  }

  await router.replace({
    name: 'Login',
    query: { returnUrl: getSafeReturnUrl(currentRoute.fullPath) },
  });
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia);
  const meta = to.meta;

  if (to.name !== 'NotFound') {
    await authStore.resolveInitialState();
  }

  if (meta.guestOnly && authStore.status === 'authenticated') {
    const returnUrl =
      typeof to.query.returnUrl === 'string' ? to.query.returnUrl : undefined;

    return getSafeReturnUrl(returnUrl);
  }

  if (meta.requiresAuth && authStore.status !== 'authenticated') {
    return {
      name: 'Login',
      query: { returnUrl: getSafeReturnUrl(to.fullPath) },
    };
  }

  if (meta.permission && !authStore.can(meta.permission)) {
    /* Not modify */
    return {
      name: 'Forbidden',
      params: { pathMatch: to.path.substring(1).split('/') },
      query: to.query,
      hash: to.hash,
    };
  }
});
