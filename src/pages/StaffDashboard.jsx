
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, GraduationCap, TrendingUp, DollarSign, BarChart3, Lock, Home, Clock, MessageCircle, Mic, Sparkles } from 'lucide-react';
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

  const modules = [
    {
      title: "Staff Directory",
      description: "View all team members, roles, and contact information",
      icon: Users,
      url: createPageUrl("TeamDirectory"),
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Shift Management",
      description: "Weekly rotas, my shifts, availability, and scheduling",
      icon: Calendar,
      url: createPageUrl("StaffRota"),
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "AI Rota Generator",
      description: "AI-powered automatic shift scheduling and optimization",
      icon: Sparkles,
      url: createPageUrl("AIRotaGenerator"),
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      title: "Attendance & Clock In",
      description: "Clock in/out, attendance tracking, and time management",
      icon: Clock,
      url: createPageUrl("ClockInOut"),
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "AI Meeting Minutes",
      description: "Record meetings, AI transcription, and action item extraction",
      icon: Mic,
      url: createPageUrl("MeetingDashboard"),
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-50",
      iconColor: "text-pink-600",
    },
    {
      title: "Performance & Coaching",
      description: "Performance reviews, coaching sessions, and goal tracking",
      icon: TrendingUp,
      url: createPageUrl("CoachingDashboard"),
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      title: "Training Academy",
      description: "Onboarding, training modules, certifications, and learning",
      icon: GraduationCap,
      url: createPageUrl("TrainingAcademy"),
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Communication",
      description: "Team chat, announcements, suggestion box, and feedback",
      icon: MessageCircle,
      url: createPageUrl("CommunicationFeedback"),
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-50",
      iconColor: "text-cyan-600",
    },
  ];

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
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
