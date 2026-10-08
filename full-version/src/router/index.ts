/**
 * Open Dental Dashboard Router
 */
import { createRouter, createWebHistory } from 'vue-router';
import MainRoutes from './MainRoutes';
import PublicRoutes from './PublicRoutes';
import { useAuthStore } from '@/stores/auth';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    MainRoutes,
    PublicRoutes,
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/views/pages/Error404Page.vue')
    }
  ]
});

router.beforeEach(async (to, from, next) => {
  const publicPages = ['/', '/login', '/register', '/error'];
  // Prefix allowlist: the short invite rescue path is dynamic (`/o/:id`), so exact
  // matching cannot cover it. Only this prefix is added; nothing else stays public.
  const publicPrefixes = ['/o/'];
  const auth = useAuthStore();

  const isPublicPage = publicPages.includes(to.path) || publicPrefixes.some((prefix) => to.path.startsWith(prefix));
  const authRequired = !isPublicPage && to.matched.some((record) => record.meta.requiresAuth);

  // Determine the user's landing page based on their products
  const getLandingPage = () => {
    if (!auth.user) return '/login';
    if (auth.hasProduct('writeback')) return '/dashboard/default';
    if (auth.hasProduct('extraction')) return '/main/extraction';
    return '/login'; // no products — shouldn't happen
  };

  if (authRequired && !auth.user) {
    auth.returnUrl = to.fullPath;
    next('/login');
  } else if (auth.user && to.path === '/login') {
    next(getLandingPage());
  } else {
    // Check product-level access
    const requiredProduct = to.meta?.requiredProduct as string | undefined;
    if (requiredProduct && auth.user && !auth.hasProduct(requiredProduct)) {
      next(getLandingPage());
    } else {
      next();
    }
  }
});
