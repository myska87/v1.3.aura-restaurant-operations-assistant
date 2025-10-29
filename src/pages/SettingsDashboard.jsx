import React from 'react';
import { Settings, Users, Database, Shield, Palette } from 'lucide-react';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import UserManagement from './UserManagement';
import DataManagement from './DataManagement';
import SecurityDashboard from './SecurityDashboard';
import BackupSettings from './BackupSettings';

export default function SettingsDashboard() {
  const tabs = [
    {
      value: 'users',
      label: 'Users',
      icon: Users,
      component: <UserManagement />,
    },
    {
      value: 'data',
      label: 'Data',
      icon: Database,
      component: <DataManagement />,
    },
    {
      value: 'security',
      label: 'Security',
      icon: Shield,
      component: <SecurityDashboard />,
    },
    {
      value: 'backups',
      label: 'Backups',
      icon: Database,
      component: <BackupSettings />,
    },
  ];

  return (
    <DashboardTabsLayout
      title="Settings"
      description="System configuration and administration"
      icon={Settings}
      tabs={tabs}
      defaultTab="users"
      helpText="Configure system settings, manage users, and control security."
    />
  );
}