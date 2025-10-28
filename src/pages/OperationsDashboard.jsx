import React from 'react';
import { Target, ClipboardCheck, Clock, Activity, Star } from 'lucide-react';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import MyChecklists from './MyChecklists';
import DailyChecklists from './DailyChecklists';
import HygieneDashboard from './HygieneDashboard';
import QuickQualityCheck from './QuickQualityCheck';
import OperationsCore from './OperationsCore';

export default function OperationsDashboard() {
  const tabs = [
    {
      value: 'overview',
      label: 'Overview',
      icon: Target,
      component: <OperationsCore />,
    },
    {
      value: 'my-checklists',
      label: 'My Checklists',
      icon: ClipboardCheck,
      component: <MyChecklists />,
    },
    {
      value: 'daily-checklists',
      label: 'Daily Checklists',
      icon: Clock,
      component: <DailyChecklists />,
    },
    {
      value: 'hygiene',
      label: 'Hygiene',
      icon: Activity,
      component: <HygieneDashboard />,
    },
    {
      value: 'quality',
      label: 'Quality Check',
      icon: Star,
      component: <QuickQualityCheck />,
    },
  ];

  return (
    <DashboardTabsLayout
      title="Operations Hub"
      description="Daily operations, checklists, and quality control"
      icon={Target}
      tabs={tabs}
      defaultTab="overview"
      helpText="Manage all daily operations including checklists, hygiene records, and quality audits from one central hub."
      searchPlaceholder="Search operations..."
    />
  );
}