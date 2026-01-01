import {
  DashboardIcon,
  ActivityIcon,
  SearchIcon,
  ChartBarIcon,
  BuildingArchIcon,
  RobotIcon,
  ClipboardListIcon
} from 'vue-tabler-icons';

export interface menu {
  header?: string;
  title?: string;
  icon?: any;
  to?: string;
  children?: menu[];
}

const sidebarItem: menu[] = [
  { header: 'Overview' },
  {
    title: 'Operations Hub',
    icon: DashboardIcon,
    to: '/dashboard/default'
  },
  { header: 'Live Stream' },
  {
    title: 'Live Activity',
    icon: ActivityIcon,
    to: '/operations/live-activity'
  },
  {
    title: 'Patient Search',
    icon: SearchIcon,
    to: '/operations/patient-search'
  },
  { header: 'Analytics' },
  {
    title: 'Reports',
    icon: ChartBarIcon,
    to: '/analytics/reports'
  },
  { header: 'Administration' },
  {
    title: 'Client Management',
    icon: BuildingArchIcon,
    to: '/admin/clients'
  },
  {
    title: 'Bot Operations',
    icon: RobotIcon,
    to: '/admin/bot-ops'
  },
  {
    title: 'System Logs',
    icon: ClipboardListIcon,
    to: '/admin/logs'
  }
];

export default sidebarItem;
