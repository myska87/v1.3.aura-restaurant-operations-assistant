import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Clock,
  Users,
  Package,
  Star,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Activity,
  FileText,
  Zap,
  Target,
  Lightbulb,
  BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, formatDistanceToNow, startOfWeek } from 'date-fns';
import { AgentManager } from '@/components/aurabrain';
import {
  HygieneSummaryWidget,
  InventoryStatusWidget,
  StaffKPIWidget,
  SOPAlertsWidget,
  QualityScoreWidget
} from '@/components/widgets';

export default function DashboardPro() {
  const [agentStatus, setAgentStatus] = useState({
    hygiene: { status: 'idle', icon: '⏸️' },
    inventory: { status: 'idle', icon: '⏸️' },
    quality: { status: 'idle', icon: '⏸️' }
  });

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Determine role
  const isAdmin = user?.role === 'admin';
  const isManager = user?.position === 'manager' || user?.position === 'owner';
  const isKitchen = ['chef', 'sous_chef', 'line_cook'].includes(user?.position?.toLowerCase());
  const isFrontOfHouse = ['server', 'bartender', 'host'].includes(user?.position?.toLowerCase());

  // Initialize agents for managers
  useEffect(() => {
    if (!isManager && !isAdmin) return;

    const initializeAgents = async () => {
      try {
        const manager = new AgentManager();
        
        setAgentStatus({
          hygiene: { status: 'running', icon: '🔄' },
          inventory: { status: 'running', icon: '🔄' },
          quality: { status: 'running', icon: '🔄' }
        });

        const result = await manager.initialize();

        setAgentStatus({
          hygiene: { status: 'active', icon: '✅' },
          inventory: { status: 'active', icon: '✅' },
          quality: { status: 'active', icon: '✅' }
        });

        console.log('🧠 Agents initialized:', result);

      } catch (error) {
        console.error('Agent initialization failed:', error);
        setAgentStatus({
          hygiene: { status: 'error', icon: '❌' },
          inventory: { status: 'error', icon: '❌' },
          quality: { status: 'error', icon: '❌' }
        });
      }
    };

    initializeAgents();
  }, [isManager, isAdmin]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Fetch shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['todayShifts', todayStr],
    queryFn: () => base44.entities.Shift.filter({ shift_date: todayStr }),
  });

  // Fetch my shift
  const { data: myShifts = [] } = useQuery({
    queryKey: ['myShifts', user?.email],
    queryFn: () => base44.entities.Shift.filter({
      staff_email: user?.email,
      shift_date: { $gte: todayStr }
    }, 'shift_date', 10),
    enabled: !!user?.email,
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['myTasks', user?.email],
    queryFn: () => base44.entities.StaffTask.filter({
      assigned_to: user?.email,
      status: { $in: ['pending', 'in_progress'] }
    }),
    enabled: !!user?.email,
  });

  // Fetch forms
  const { data: forms = [] } = useQuery({
    queryKey: ['myForms', user?.email],
    queryFn: () => base44.entities.FormAssignmentMetadata.filter({
      assigned_to_email: user?.email,
      completion_status: { $in: ['pending', 'in_progress'] }
    }),
    enabled: !!user?.email,
  });

  // Fetch recent activities with auto-refresh
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['recentActivities'],
    queryFn: async () => {
      if (isManager || isAdmin) {
        return await base44.entities.ActivityLog.list('-created_date', 20);
      } else {
        return await base44.entities.ActivityLog.filter(
          { user_email: user?.email },
          '-created_date',
          20
        );
      }
    },
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  // Operations Core Metrics
  const { data: operationTasks = [] } = useQuery({
    queryKey: ['operationTasksStats'],
    queryFn: () => base44.entities.OperationTask.list('-due_date', 100),
  });

  const { data: weeklySummary } = useQuery({
    queryKey: ['currentWeeklySummary'],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const summaries = await base44.entities.OperationWeeklySummary.filter({
        week_start_date: format(weekStart, 'yyyy-MM-dd')
      });
      return summaries[0] || null;
    },
  });

  const { data: latestInsights = [] } = useQuery({
    queryKey: ['latestInsights'],
    queryFn: () => base44.entities.AnalyticsInsight.list('-insight_date', 3),
  });

  const myActiveShift = myShifts.find(s => s.status === 'in_progress');
  const todayShift = myShifts.find(s => s.shift_date === todayStr);
  const staffOnDuty = shifts.filter(s => s.status === 'in_progress').length;

  const operationsStats = {
    completedTasks: operationTasks.filter(t => t.status === 'completed').length,
    overdueTasks: operationTasks.filter(t => t.status === 'overdue').length,
    completionRate: operationTasks.length > 0
      ? Math.round((operationTasks.filter(t => t.status === 'completed').length / operationTasks.length) * 100)
      : 0,
  };

  const getActivityIcon = (activityType) => {
    const iconMap = {
      clock_in: <Clock className="w-4 h-4 text-green-600" />,
      clock_out: <Clock className="w-4 h-4 text-blue-600" />,
      sop_signed: <CheckCircle className="w-4 h-4 text-green-600" />,
      quality_check: <Star className="w-4 h-4 text-amber-600" />,
      checklist_completed: <CheckCircle className="w-4 h-4 text-green-600" />,
      form_submitted: <CheckCircle className="w-4 h-4 text-indigo-600" />,
      task_completed: <CheckCircle className="w-4 h-4 text-green-600" />,
    };
    return iconMap[activityType] || <Activity className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            AURA Control Center 🎯
          </h1>
          <p className="text-gray-600">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • Welcome back, {user?.full_name}
          </p>
        </div>

        {/* 🧠 AURA Brain Live Status - Managers Only */}
        {(isManager || isAdmin) && (
          <Card className="mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">AURA Brain Status</h3>
                    <p className="text-purple-100">AI agents monitoring operations in real-time</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-center bg-white/10 backdrop-blur rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{agentStatus.hygiene.icon}</span>
                      <span className="text-xs font-medium">Hygiene</span>
                    </div>
                    <p className="text-xs text-purple-100 capitalize">{agentStatus.hygiene.status}</p>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{agentStatus.inventory.icon}</span>
                      <span className="text-xs font-medium">Stock</span>
                    </div>
                    <p className="text-xs text-purple-100 capitalize">{agentStatus.inventory.status}</p>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{agentStatus.quality.icon}</span>
                      <span className="text-xs font-medium">Quality</span>
                    </div>
                    <p className="text-xs text-purple-100 capitalize">{agentStatus.quality.status}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Shift Banner */}
        {myActiveShift && (
          <Card className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">Currently Clocked In</span>
                  </div>
                  <p className="text-emerald-50">
                    {myActiveShift.role} • Started at {myActiveShift.start_time}
                  </p>
                </div>
                <Link to={createPageUrl('ClockInOut')}>
                  <Button variant="secondary" size="sm">
                    View Shift
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Shift (if not clocked in yet) */}
        {!myActiveShift && todayShift && (
          <Card className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold">Your Shift Today</span>
                  </div>
                  <p className="text-blue-50">
                    {todayShift.role} • {todayShift.start_time} - {todayShift.end_time}
                  </p>
                </div>
                <Link to={createPageUrl('ClockInOut')}>
                  <Button variant="secondary" size="lg">
                    Clock In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Latest AI Insights */}
        {latestInsights.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                Latest AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {latestInsights.map((insight) => (
                  <div key={insight.id} className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-start gap-2">
                      <Badge className={
                        insight.severity === 'positive' ? 'bg-green-100 text-green-800' :
                        insight.severity === 'warning' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {insight.category}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                        <p className="text-xs text-gray-700">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role-Based Widget Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Everyone gets these */}
          <StaffKPIWidget user={user} />
          <SOPAlertsWidget user={user} />

          {/* Managers get full suite */}
          {(isManager || isAdmin) && (
            <>
              <HygieneSummaryWidget user={user} />
              <InventoryStatusWidget user={user} />
              <QualityScoreWidget user={user} />
            </>
          )}

          {/* Kitchen gets hygiene + quality */}
          {isKitchen && !isManager && (
            <>
              <HygieneSummaryWidget user={user} />
              <QualityScoreWidget user={user} />
            </>
          )}

          {/* Front of House gets quality */}
          {isFrontOfHouse && (
            <QualityScoreWidget user={user} />
          )}
        </div>

        {/* Quick Stats Row */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{operationsStats.completedTasks}</p>
                  <p className="text-sm text-gray-600">Tasks Done</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{operationsStats.overdueTasks}</p>
                  <p className="text-sm text-gray-600">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{operationsStats.completionRate}%</p>
                  <p className="text-sm text-gray-600">Completion</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(isManager || isAdmin) && (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{staffOnDuty}</p>
                    <p className="text-sm text-gray-600">On Duty</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity Feed */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Recent Activity
              <Badge variant="outline" className="ml-2">Live</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Auto-refreshing
            </div>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="font-medium">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50 hover:shadow-md transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.user_name} • {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}