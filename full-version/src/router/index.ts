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
  const auth = useAuthStore();

  const isPublicPage = publicPages.includes(to.path);
  const authRequired = !isPublicPage && to.matched.some((record) => record.meta.requiresAuth);

  if (authRequired && !auth.user) {
    auth.returnUrl = to.fullPath;
    next('/login');
  } else if (auth.user && to.path === '/login') {
    next('/dashboard/default');
  } else {
    // Check product-level access
    const requiredProduct = to.meta?.requiredProduct as string | undefined;
    if (requiredProduct && auth.user && !auth.hasProduct(requiredProduct)) {
      next('/dashboard/default');
    } else {
      next();
    }
  }
});
