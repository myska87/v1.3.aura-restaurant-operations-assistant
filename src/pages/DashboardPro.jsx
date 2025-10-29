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
  ClipboardCheck,
  User,
  Zap,
  Target,
  Lightbulb,
  BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, formatDistanceToNow, startOfWeek } from 'date-fns';
import { AgentManager } from '@/components/aurabrain';

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
  const isStaff = !isAdmin && !isManager;

  // Initialize agents for managers
  useEffect(() => {
    if (!isManager && !isAdmin) return;

    const initializeAgents = async () => {
      try {
        const manager = new AgentManager();
        
        // Update status to running
        setAgentStatus({
          hygiene: { status: 'running', icon: '🔄' },
          inventory: { status: 'running', icon: '🔄' },
          quality: { status: 'running', icon: '🔄' }
        });

        const result = await manager.initialize();

        // Update status based on results
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

  // Get today's date
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Fetch shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['todayShifts', todayStr],
    queryFn: () => base44.entities.Shift.filter({ shift_date: todayStr }),
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['myTasks', user?.email],
    queryFn: () => base44.entities.StaffTask.filter({
      assigned_to: user?.email
    }),
    enabled: !!user?.email,
  });

  // Fetch forms
  const { data: forms = [] } = useQuery({
    queryKey: ['myForms', user?.email],
    queryFn: () => base44.entities.FormAssignmentMetadata.filter({
      assigned_to_email: user?.email
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

  // Analytics Data
  const { data: latestAnalytics } = useQuery({
    queryKey: ['latestAnalyticsSnapshot'],
    queryFn: async () => {
      const snapshots = await base44.entities.AnalyticsSnapshot.list('-snapshot_date', 1);
      return snapshots[0] || null;
    },
  });

  const { data: latestInsights = [] } = useQuery({
    queryKey: ['latestInsights'],
    queryFn: () => base44.entities.AnalyticsInsight.list('-insight_date', 3),
  });

  // Calculate metrics
  const myActiveShift = shifts.find(s =>
    s.staff_email === user?.email && s.status === 'in_progress'
  );

  const pendingTasks = tasks.filter(t =>
    t.status === 'pending' || t.status === 'in_progress'
  ).length;

  const pendingForms = forms.filter(f =>
    f.completion_status === 'pending' || f.completion_status === 'in_progress'
  ).length;

  const staffOnDuty = shifts.filter(s => s.status === 'in_progress').length;

  const operationsStats = {
    totalTasks: operationTasks.length,
    completedTasks: operationTasks.filter(t => t.status === 'completed').length,
    overdueTasks: operationTasks.filter(t => t.status === 'overdue').length,
    completionRate: operationTasks.length > 0
      ? Math.round((operationTasks.filter(t => t.status === 'completed').length / operationTasks.length) * 100)
      : 0,
    auditPerformance: weeklySummary?.avg_score || 0,
  };

  // Activity icon mapper
  const getActivityIcon = (activityType) => {
    const iconMap = {
      clock_in: <Clock className="w-4 h-4 text-green-600" />,
      clock_out: <Clock className="w-4 h-4 text-blue-600" />,
      sop_added: <FileText className="w-4 h-4 text-purple-600" />,
      sop_signed: <CheckCircle className="w-4 h-4 text-green-600" />,
      document_uploaded: <FileText className="w-4 h-4 text-blue-600" />,
      document_signed: <CheckCircle className="w-4 h-4 text-emerald-600" />,
      quality_check: <Star className="w-4 h-4 text-amber-600" />,
      checklist_completed: <ClipboardCheck className="w-4 h-4 text-green-600" />,
      form_submitted: <ClipboardCheck className="w-4 h-4 text-indigo-600" />,
      shift_started: <Calendar className="w-4 h-4 text-teal-600" />,
      shift_completed: <Calendar className="w-4 h-4 text-blue-600" />,
      task_completed: <CheckCircle className="w-4 h-4 text-green-600" />,
      maintenance_reported: <AlertTriangle className="w-4 h-4 text-orange-600" />,
      order_created: <Package className="w-4 h-4 text-purple-600" />,
    };
    return iconMap[activityType] || <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getActivityColor = (activityType) => {
    const colorMap = {
      clock_in: 'bg-green-50 border-green-200',
      clock_out: 'bg-blue-50 border-blue-200',
      sop_added: 'bg-purple-50 border-purple-200',
      sop_signed: 'bg-green-50 border-green-200',
      document_uploaded: 'bg-blue-50 border-blue-200',
      document_signed: 'bg-emerald-50 border-emerald-200',
      quality_check: 'bg-amber-50 border-amber-200',
      checklist_completed: 'bg-green-50 border-green-200',
      form_submitted: 'bg-indigo-50 border-indigo-200',
      shift_started: 'bg-teal-50 border-teal-200',
      shift_completed: 'bg-blue-50 border-blue-200',
      task_completed: 'bg-green-50 border-green-200',
      maintenance_reported: 'bg-orange-50 border-orange-200',
      order_created: 'bg-purple-50 border-purple-200',
    };
    return colorMap[activityType] || 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name || 'User'}! 👋
          </h1>
          <p className="text-gray-600">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
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
          <Card className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none">
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

        {/* AI Analytics Summary Card */}
        {latestAnalytics && (
          <Link to={createPageUrl('AnalyticsDashboard')}>
            <Card className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none hover:shadow-2xl transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <BarChart3 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">This Week: Intelligence Summary</h3>
                      <p className="text-blue-100">
                        {latestAnalytics.task_completion_rate}% compliance,
                        {latestAnalytics.quality_score_avg > 0 && ` ${latestAnalytics.quality_score_avg.toFixed(1)}★ quality`}
                        {latestAnalytics.inventory_cost_variance > 0 && `, ${latestAnalytics.inventory_cost_variance.toFixed(1)}% cost variance`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">View Full Analytics →</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Operations Core Banner */}
        <Link to={createPageUrl('OperationsCore')}>
          <Card className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-none hover:shadow-2xl transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <Target className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">Operations Central</h3>
                    <p className="text-emerald-100">Unified view of all SOPs, Audits & Checklists</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold mb-1">{operationsStats.completionRate}%</p>
                  <p className="text-sm opacity-90">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

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

        {/* Operations Core Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{operationsStats.completedTasks}</p>
                  <p className="text-sm text-gray-600">Tasks Completed</p>
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
                  <p className="text-sm text-gray-600">Overdue Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{operationsStats.auditPerformance.toFixed(1)}</p>
                  <p className="text-sm text-gray-600">Audit Score</p>
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
                  <p className="text-sm text-gray-600">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Tasks Card */}
          <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                My Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {pendingTasks}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Pending</p>
                </div>
                <Link to={createPageUrl('MyTasks')}>
                  <Button variant="ghost" size="sm">
                    View →
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Forms Card */}
          <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-600" />
                Forms Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {pendingForms}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">To Complete</p>
                </div>
                <Link to={createPageUrl('FormLibrary')}>
                  <Button variant="ghost" size="sm">
                    View →
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Shifts Card */}
          <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Today's Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {shifts.length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Scheduled</p>
                </div>
                <Link to={createPageUrl('MyShifts')}>
                  <Button variant="ghost" size="sm">
                    View →
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Staff On Duty (Manager Only) */}
          {(isManager || isAdmin) && (
            <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Staff On Duty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {staffOnDuty}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Currently Working</p>
                  </div>
                  <Link to={createPageUrl('StaffRota')}>
                    <Button variant="ghost" size="sm">
                      View →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <Card className="bg-white border-none shadow-sm mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to={createPageUrl('ClockInOut')}>
                <Button variant="outline" className="w-full">
                  <Clock className="w-4 h-4 mr-2" />
                  Clock In/Out
                </Button>
              </Link>
              <Link to={createPageUrl('MyTasks')}>
                <Button variant="outline" className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  My Tasks
                </Button>
              </Link>
              <Link to={createPageUrl('MyShifts')}>
                <Button variant="outline" className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  My Shifts
                </Button>
              </Link>
              {(isManager || isAdmin) && (
                <Link to={createPageUrl('ManagerDashboard')}>
                  <Button variant="outline" className="w-full">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Manager View
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

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
                <p className="text-sm mt-2">Activities will appear here as they happen</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {recentActivities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${getActivityColor(activity.activity_type)} transition-all hover:shadow-md`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-700 mt-0.5">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <User className="w-3 h-3" />
                              {activity.user_name}
                            </div>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        {activity.is_important && (
                          <Zap className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
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