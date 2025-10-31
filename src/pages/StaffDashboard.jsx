
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, GraduationCap, TrendingUp, DollarSign, BarChart3, Lock, Home, Clock, MessageCircle, Mic } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import TeamDirectory from './TeamDirectory';
import StaffRota from './StaffRota';
import OnboardingTraining from './OnboardingTraining';
import PerformanceGrowth from './PerformanceGrowth';
import PayrollDashboard from './PayrollDashboard';
import StaffAnalytics from './StaffAnalytics';

export default function StaffDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const quickActions = [
    { title: 'Team Directory', icon: Users, color: 'from-blue-500 to-blue-600', page: 'TeamDirectory' },
    { title: 'My Shifts', icon: Calendar, color: 'from-purple-500 to-purple-600', page: 'MyShifts' },
    { title: 'Clock In/Out', icon: Clock, color: 'from-emerald-500 to-emerald-600', page: 'ClockInOut' },
    { title: 'Team Chat', icon: MessageCircle, color: 'from-pink-500 to-pink-600', page: 'TeamChat' },
    { title: 'AI Meeting Minutes', icon: Mic, color: 'from-indigo-500 to-indigo-600', page: 'MeetingDashboard' },
    { title: 'Performance', icon: TrendingUp, color: 'from-amber-500 to-amber-600', page: 'StaffAnalytics' },
  ];

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-6">
              Staff Hub is only accessible to managers and administrators.
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
