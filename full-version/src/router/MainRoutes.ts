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
      component: () => import('@/views/dashboards/default/DefaultDashboard.vue')
    },
    {
      name: 'Analytics',
      path: '/dashboard/analytics',
      component: () => import('@/views/dashboards/analytics/AnalyticsDashboard.vue')
    },
    {
      name: 'LiveActivity',
      path: '/operations/live-activity',
      component: () => import('@/views/operations/LiveActivity.vue')
    },
    {
      name: 'PatientSearch',
      path: '/operations/patient-search',
      component: () => import('@/views/operations/PatientSearch.vue')
    },
    {
      name: 'Reports',
      path: '/analytics/reports',
      component: () => import('@/views/analytics/Reports.vue')
    },
    {
      name: 'ClientManagement',
      path: '/admin/clients',
      component: () => import('@/views/admin/ClientList.vue')
    },
    {
      name: 'BotOperations',
      path: '/admin/bot-ops',
      component: () => import('@/views/admin/BotOperations.vue')
    },
    {
      name: 'SystemLogs',
      path: '/admin/logs',
      component: () => import('@/views/admin/SystemLogs.vue')
    }
  ]
};

export default MainRoutes;
