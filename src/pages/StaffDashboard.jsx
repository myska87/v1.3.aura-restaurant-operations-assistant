import React from 'react';
import { Users, Calendar, GraduationCap, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import TeamDirectory from './TeamDirectory';
import StaffRota from './StaffRota';
import OnboardingTraining from './OnboardingTraining';
import PerformanceGrowth from './PerformanceGrowth';
import PayrollDashboard from './PayrollDashboard';
import StaffAnalytics from './StaffAnalytics';

export default function StaffDashboard() {
  const tabs = [
    {
      value: 'directory',
      label: 'Team Directory',
      icon: Users,
      component: <TeamDirectory />,
    },
    {
      value: 'scheduling',
      label: 'Scheduling',
      icon: Calendar,
      component: <StaffRota />,
    },
    {
      value: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      component: <StaffAnalytics />,
    },
    {
      value: 'training',
      label: 'Training',
      icon: GraduationCap,
      component: <OnboardingTraining />,
    },
    {
      value: 'performance',
      label: 'Performance',
      icon: TrendingUp,
      component: <PerformanceGrowth />,
    },
    {
      value: 'payroll',
      label: 'Payroll',
      icon: DollarSign,
      component: <PayrollDashboard />,
    },
  ];

  return (
    <DashboardTabsLayout
      title="Staff Hub"
      description="Team management, scheduling, training, and payroll"
      icon={Users}
      tabs={tabs}
      defaultTab="directory"
      helpText="Manage your entire team from recruitment to payroll in one unified hub."
      searchPlaceholder="Search staff members..."
    />
  );
}