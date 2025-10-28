import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Package,
  ClipboardCheck,
  Calendar,
  Star,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Activity,
  Target,
  Award,
  Zap,
  BarChart3,
  MessageCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

// Import Dashboard API
import { getDashboardSummary, getWeeklyTrends } from '@/api/dashboard-api';

// Import Chart Components
import ComplianceChart from '@/components/dashboard/ComplianceChart';
import QualityTrendChart from '@/components/dashboard/QualityTrendChart';
import TaskCompletionChart from '@/components/dashboard/TaskCompletionChart';

export default function DashboardPro() {
  const [refreshing, setRefreshing] = useState(false);

  // Current User
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Dashboard Summary (Main Metrics)
  const { data: summary, refetch: refetchSummary, isLoading } = useQuery({
    queryKey: ['dashboardSummary', user?.email],
    queryFn: () => getDashboardSummary(user),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  // Weekly Trends (For Charts)
  const { data: weeklyTrends, refetch: refetchTrends } = useQuery({
    queryKey: ['weeklyTrends', user?.email],
    queryFn: () => getWeeklyTrends(user),
    enabled: !!user && (user.role === 'admin' || user.position === 'manager' || user.position === 'owner'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Role Detection
  const isStaff = summary?.role === 'staff';
  const isManager = summary?.role === 'manager' || summary?.role === 'admin';

  // Refresh Handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchSummary(),
      refetchTrends(),
    ]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-[#014D40] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: STAFF VIEW
  // ========================================

  if (isStaff && summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {summary.user.name?.split(' ')[0] || 'Team Member'}! 👋
              </h1>
              <p className="text-gray-600 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </motion.div>

          {/* KPI Cards - Staff */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">My Tasks</p>
                      <h3 className="text-3xl font-bold text-gray-900">{summary.summary.my_tasks_pending}</h3>
                      <p className="text-xs text-gray-500 mt-2">{summary.summary.my_tasks_completed} completed</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <Progress 
                    value={summary.metrics.task_completion_rate} 
                    className="h-2 mt-4"
                  />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pending Forms</p>
                      <h3 className="text-3xl font-bold text-gray-900">{summary.summary.my_forms_pending}</h3>
                      <p className="text-xs text-gray-500 mt-2">{summary.summary.my_forms_completed} completed</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <ClipboardCheck className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <Progress 
                    value={summary.metrics.form_completion_rate} 
                    className="h-2 mt-4"
                  />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Shift Status</p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {summary.summary.my_shift_status === 'active' ? 'On Duty' : 'Off Duty'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-2">
                        {summary.summary.my_shift_status === 'active' ? 'Currently working' : 'Not clocked in'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions - Staff */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#014D40]" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to={createPageUrl('ClockInOut')}>
                  <Button className="w-full bg-[#014D40] hover:bg-[#013830]">
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
                    My Schedule
                  </Button>
                </Link>
                <Link to={createPageUrl('TeamChat')}>
                  <Button variant="outline" className="w-full">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Team Chat
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: MANAGER/ADMIN VIEW
  // ========================================

  if (isManager && summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Operations Command Center
              </h1>
              <p className="text-gray-600 mt-1">
                {format(new Date(), 'EEEE, MMMM d, yyyy')} • Real-time insights
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </motion.div>

          {/* KPI Summary - Manager/Admin */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Staff on Duty</p>
                      <h3 className="text-3xl font-bold text-gray-900">{summary.summary.staff_on_duty}</h3>
                      <p className="text-xs text-gray-500 mt-2">of {summary.summary.staff_scheduled} scheduled</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Checklist Progress</p>
                      <h3 className="text-3xl font-bold text-gray-900">{summary.summary.checklist_progress}%</h3>
                      <p className="text-xs text-gray-500 mt-2">{summary.summary.tasks_pending} tasks pending</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <ClipboardCheck className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <Progress 
                    value={summary.summary.checklist_progress} 
                    className="h-2 mt-4"
                  />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Inventory Alerts</p>
                      <h3 className="text-3xl font-bold text-gray-900">{summary.summary.inventory_alerts}</h3>
                      <p className="text-xs text-gray-500 mt-2">Items need reordering</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Quality Score</p>
                      <h3 className="text-3xl font-bold text-gray-900">{summary.summary.quality_score.toFixed(1)}</h3>
                      <p className="text-xs text-gray-500 mt-2">out of 5.0</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Star className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Row */}
          {weeklyTrends && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <QualityTrendChart data={weeklyTrends} />
              <TaskCompletionChart data={weeklyTrends} />
              <ComplianceChart data={weeklyTrends} />
            </div>
          )}

          {/* Operations Snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Critical Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary.summary.inventory_alerts > 0 || summary.summary.tasks_pending > 10 ? (
                  <div className="space-y-3">
                    {summary.summary.inventory_alerts > 0 && (
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div>
                          <p className="font-medium text-red-900">Low Stock Items</p>
                          <p className="text-sm text-red-700">
                            {summary.summary.inventory_alerts} items need immediate reordering
                          </p>
                        </div>
                        <Link to={createPageUrl('InventoryManagement')}>
                          <Button size="sm" variant="destructive">
                            View
                          </Button>
                        </Link>
                      </div>
                    )}
                    {summary.summary.tasks_pending > 10 && (
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div>
                          <p className="font-medium text-yellow-900">High Task Backlog</p>
                          <p className="text-sm text-yellow-700">
                            {summary.summary.tasks_pending} tasks pending completion
                          </p>
                        </div>
                        <Link to={createPageUrl('MyTasks')}>
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">No critical alerts</p>
                    <p className="text-sm text-gray-500">All systems operating normally</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Insights Panel */}
            <Card className="bg-gradient-to-br from-[#014D40] to-[#013830] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.summary.quality_score >= 4.5 && (
                    <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg backdrop-blur">
                      <Award className="w-5 h-5 mt-0.5" />
                      <div>
                        <p className="font-medium">Excellence Achievement</p>
                        <p className="text-sm opacity-90">
                          Quality score of {summary.summary.quality_score}/5 - Outstanding performance!
                        </p>
                      </div>
                    </div>
                  )}
                  {summary.summary.inventory_alerts > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg backdrop-blur">
                      <Target className="w-5 h-5 mt-0.5" />
                      <div>
                        <p className="font-medium">Stock Optimization</p>
                        <p className="text-sm opacity-90">
                          {summary.summary.inventory_alerts} items need reordering. Review inventory now.
                        </p>
                      </div>
                    </div>
                  )}
                  {summary.summary.checklist_progress >= 90 && (
                    <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg backdrop-blur">
                      <CheckCircle className="w-5 h-5 mt-0.5" />
                      <div>
                        <p className="font-medium">Great Progress</p>
                        <p className="text-sm opacity-90">
                          {summary.summary.checklist_progress}% checklist completion - Keep it up!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Quick Actions - Manager */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#014D40]" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Link to={createPageUrl('StaffRota')}>
                  <Button variant="outline" className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Staff Rota
                  </Button>
                </Link>
                <Link to={createPageUrl('MyTasks')}>
                  <Button variant="outline" className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Tasks
                  </Button>
                </Link>
                <Link to={createPageUrl('InventoryManagement')}>
                  <Button variant="outline" className="w-full">
                    <Package className="w-4 h-4 mr-2" />
                    Inventory
                  </Button>
                </Link>
                <Link to={createPageUrl('QualityDashboard')}>
                  <Button variant="outline" className="w-full">
                    <Star className="w-4 h-4 mr-2" />
                    Quality
                  </Button>
                </Link>
                <Link to={createPageUrl('Reports')}>
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Reports
                  </Button>
                </Link>
                <Link to={createPageUrl('SOPDashboard')}>
                  <Button variant="outline" className="w-full">
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    SOPs
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    );
  }

  return null;
}