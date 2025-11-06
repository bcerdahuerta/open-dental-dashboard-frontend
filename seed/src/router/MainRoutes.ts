const MainRoutes = {
  path: '/main',
  meta: {
    requiresAuth: true
  },
  redirect: '/main',
  component: () => import('@/layouts/full/FullLayout.vue'),
  children: [
    {
      name: 'Starter',
      path: '/starter',
      component: () => import('@/views/StarterPage.vue')
    }
  ]
};

export default MainRoutes;
