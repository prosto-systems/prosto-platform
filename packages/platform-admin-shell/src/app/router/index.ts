import type { AdminShellPermissionType } from '@prosto/platform-sdk/admin';
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router';
import { pinia } from '@/app/plugins/pinia';
import { WorkspacePage } from '@/app/shell';
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
import { usePlatform } from '@/features/platform';

declare module 'vue-router' {
  interface RouteMeta {
    readonly title?: string;
    readonly guestOnly?: boolean;
    readonly requiresAuth?: boolean;
    readonly permission?: AdminShellPermissionType;
    readonly on?: {
      readonly mounted?: () => void | Promise<void>;
      readonly unmounted?: () => void | Promise<void>;
    };
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
    meta: { requiresAuth: true },
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
    {
      path: '/workspace',
      name: 'Workspace',
      // component: RouterView,
      component: WorkspacePage,
      children: [],
      redirect: { name: 'Dashboard' },
      meta: { requiresAuth: true },
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

/* Check authorization */
router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia);
  const meta = to.meta;

  await authStore.resolveInitialState();

  if (meta.guestOnly && authStore.isAuthenticated) {
    const returnUrl =
      typeof to.query.returnUrl === 'string' ? to.query.returnUrl : undefined;

    return getSafeReturnUrl(returnUrl);
  }

  if (meta.requiresAuth && !authStore.isAuthenticated) {
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

/* Load platform plugins */
router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia);
  const { manifest, loadManifest, loadPlugins } = usePlatform();

  if (!manifest.data.value && authStore.isAuthenticated) {
    const loadedManifest = await loadManifest();

    if (loadedManifest) {
      await loadPlugins(loadedManifest.plugins);

      return to.fullPath;
    }
  }
});
