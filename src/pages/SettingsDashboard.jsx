import React from 'react';
import { Settings, Users, Database, Shield } from 'lucide-react';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import UserManagement from './UserManagement';
import DataManagement from './DataManagement';
import SystemProtection from './SystemProtection';

export default function SettingsDashboard() {
  const tabs = [
    {
      value: 'users',
      label: 'User Management',
      icon: Users,
      component: <UserManagement />,
    },
    {
      value: 'data',
      label: 'Data Management',
      icon: Database,
      component: <DataManagement />,
    },
    {
      value: 'security',
      label: 'System Protection',
      icon: Shield,
      component: <SystemProtection />,
    },
  ];

  return (
    <DashboardTabsLayout
      title="Settings"
      description="System configuration and management"
      icon={Settings}
      tabs={tabs}
      defaultTab="users"
      helpText="Manage users, data, and system security settings."
    />
  );
}