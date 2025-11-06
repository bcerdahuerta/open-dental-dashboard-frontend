const PublicRoutes = {
  path: '/',
  component: () => import('@/layouts/blank/BlankLayout.vue'),
  meta: {
    requiresAuth: false
  },
  children: [
    {
      name: 'Authentication',
      path: '/login',
      component: () => import('@/views/authentication/LoginPage.vue')
    },
    {
      name: 'landing',
      path: '/',
      component: () => import('@/views/authentication/LoginPage.vue')
    },
    {
      name: 'Login',
      path: '/login1',
      component: () => import('@/views/authentication/auth1/LoginPage.vue')
    },
    {
      name: 'Register',
      path: '/register1',
      component: () => import('@/views/authentication/auth1/RegisterPage.vue')
    },
    {
      name: 'Forgot Password',
      path: '/forgot-pwd1',
      component: () => import('@/views/authentication/auth1/ForgotPwd1.vue')
    },
    {
      name: 'Error 404',
      path: '/error',
      component: () => import('@/views/pages/maintenance/error/Error404Page.vue')
    }
  ]
};

export default PublicRoutes;
