const PublicRoutes = {
  path: '/',
  component: () => import('@/layouts/blank/BlankLayout.vue'),
  meta: {
    requiresAuth: false
  },
  children: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      name: 'Login',
      path: '/login',
      component: () => import('@/views/authentication/auth3/LoginPage3.vue')
    },
    {
      name: 'Register',
      path: '/register',
      component: () => import('@/views/authentication/auth3/RegisterPage3.vue')
    },
    {
      name: 'Error404',
      path: '/error',
      component: () => import('@/views/pages/Error404Page.vue')
    }
  ]
};

export default PublicRoutes;
