const MainRoutes = {
  path: '/main',
  meta: {
    requiresAuth: true
  },
  redirect: '/main/dashboard/default',
  component: () => import('@/layouts/full/FullLayout.vue'),
  children: [
    {
      name: 'Default',
      path: '/dashboard/default',
      meta: { requiredProduct: 'writeback' },
      component: () => import('@/views/dashboards/default/DefaultDashboard.vue')
    },
    {
      name: 'ClientManagement',
      path: '/admin/clients',
      meta: { requiredProduct: 'writeback' },
      component: () => import('@/views/admin/ClientList.vue')
    },
    {
      name: 'ClinicManagement',
      path: '/admin/clinics',
      meta: { requiredProduct: 'writeback' },
      component: () => import('@/views/admin/ClinicList.vue')
    },
    {
      name: 'Pipelines',
      path: '/admin/pipelines',
      meta: { requiredProduct: 'writeback' },
      component: () => import('@/views/admin/PipelineList.vue')
    },
    {
      name: 'ProfileResolution',
      path: '/admin/profile-resolution',
      meta: { requiredProduct: 'writeback' },
      component: () => import('@/views/admin/ProfileResolution.vue')
    },
    {
      name: 'Templates',
      path: '/admin/templates',
      meta: { requiredProduct: 'writeback' },
      component: () => import('@/views/admin/TemplateList.vue')
    },
    {
      name: 'Users',
      path: '/admin/users',
      component: () => import('@/views/admin/UserApproval.vue')
    },
    {
      name: 'SystemLogs',
      path: '/admin/logs',
      component: () => import('@/views/admin/SystemLogs.vue')
    },
    {
      name: 'WritebackLive',
      path: '/writeback/live',
      meta: { requiredProduct: 'writeback' },
      component: () => import('@/views/writeback/LiveActivity.vue')
    },
    {
      name: 'WritebackQueue',
      path: '/writeback/queue',
      meta: { requiredProduct: 'writeback' },
      component: () => import('@/views/writeback/JobQueue.vue')
    },
    {
      name: 'ClinicDetail',
      path: '/admin/clinics/:id',
      meta: { requiredProduct: 'writeback' },
      component: () => import('@/views/admin/ClinicDetail.vue')
    },

    // Credit module
    {
      name: 'CreditDashboard',
      path: '/credit',
      meta: { requiredProduct: 'credit' },
      component: () => import('@/views/credit/CreditDashboard.vue')
    },
    {
      name: 'CreditRecords',
      path: '/credit/records',
      meta: { requiredProduct: 'credit' },
      component: () => import('@/views/credit/CreditRecords.vue')
    },
    {
      name: 'CreditRecordDetail',
      path: '/credit/records/:id',
      meta: { requiredProduct: 'credit' },
      component: () => import('@/views/credit/CreditRecordDetail.vue')
    },
    {
      name: 'CreditRuns',
      path: '/credit/runs',
      meta: { requiredProduct: 'credit' },
      component: () => import('@/views/credit/CreditRuns.vue')
    },

    {
      name: 'UserProfile',
      path: '/profile',
      component: () => import('@/views/profile/UserProfile.vue')
    }
  ]
};

export default MainRoutes;
