import {
  DashboardIcon,
  ActivityIcon,
  ListCheckIcon,
  BuildingArchIcon,
  BuildingIcon,
  ArrowsTransferDownIcon,
  TemplateIcon,
  UsersIcon,
  ClipboardListIcon,
  CreditCardIcon,
  ReportIcon,
  ClockIcon
} from 'vue-tabler-icons';

export interface menu {
  header?: string;
  title?: string;
  icon?: any;
  to?: string;
  children?: menu[];
  divider?: boolean;
  chip?: string;
  chipColor?: string;
  disabled?: boolean;
  type?: string;
  subCaption?: string;
  requiredProduct?: string;
}

const sidebarItem: menu[] = [
  { header: 'Overview' },
  { title: 'Operations Hub', icon: DashboardIcon, to: '/dashboard/default' },

  { header: 'Writeback', requiredProduct: 'writeback' },
  { title: 'Live Activity', icon: ActivityIcon, to: '/writeback/live', requiredProduct: 'writeback' },
  { title: 'Job Queue', icon: ListCheckIcon, to: '/writeback/queue', chip: 'New', chipColor: 'primary', requiredProduct: 'writeback' },

  { header: 'Credit', requiredProduct: 'credit' },
  { title: 'Dashboard', icon: CreditCardIcon, to: '/credit', requiredProduct: 'credit' },
  { title: 'Records', icon: ReportIcon, to: '/credit/records', requiredProduct: 'credit' },
  { title: 'Run History', icon: ClockIcon, to: '/credit/runs', requiredProduct: 'credit' },

  { header: 'Management' },
  { title: 'Clients', icon: BuildingArchIcon, to: '/admin/clients' },
  { title: 'Clinics', icon: BuildingIcon, to: '/admin/clinics' },
  { title: 'Pipelines', icon: ArrowsTransferDownIcon, to: '/admin/pipelines' },

  { header: 'Configuration' },
  { title: 'Templates', icon: TemplateIcon, to: '/admin/templates' },
  { title: 'Users', icon: UsersIcon, to: '/admin/users' },
  { title: 'System Logs', icon: ClipboardListIcon, to: '/admin/logs' }
];

export default sidebarItem;

