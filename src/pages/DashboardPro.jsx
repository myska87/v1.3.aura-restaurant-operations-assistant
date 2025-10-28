import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
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
import { format, isToday, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

export default function DashboardPro() {
  const [refreshing, setRefreshing] = useState(false);

  // Current User
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Role Detection
  const isAdmin = user?.role === 'admin';
  const isManager = user?.position === 'manager' || user?.position === 'owner';
  const isStaff = !isAdmin && !isManager;

  // ========================================
  // DATA FETCHING (Optimized for Performance)
  // ========================================

  // Today's Shifts
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: todayShifts = [], refetch: refetchShifts } = useQuery({
    queryKey: ['todayShifts', todayStr],
    queryFn: () => base44.entities.Shift.filter({ shift_date: todayStr }),
    staleTime: 2 * 60 * 1000,
  });

  // My Active Shift
  const myActiveShift = useMemo(() => 
    todayShifts.find(s => s.staff_email === user?.email && s.status === 'in_progress'),
    [todayShifts, user?.email]
  );

  // My Tasks (Staff View)
  const { data: myTasks = [] } = useQuery({
    queryKey: ['myTasks', user?.email],
    queryFn: () => base44.entities.StaffTask.filter({ 
      assigned_to: user?.email,
      status: { $in: ['pending', 'in_progress'] }
    }),
    enabled: !!user?.email && isStaff,
    staleTime: 2 * 60 * 1000,
  });

  // My Forms (Staff View)
  const { data: myForms = [] } = useQuery({
    queryKey: ['myForms', user?.email],
    queryFn: async () => {
      const forms = await base44.entities.FormAssignmentMetadata.filter({
        assigned_to_email: user?.email,
        completion_status: { $in: ['pending', 'in_progress'] }
      });
      return forms.filter(f => new Date(f.due_date) >= new Date());
    },
    enabled: !!user?.email && isStaff,
    staleTime: 2 * 60 * 1000,
  });

  // Manager/Admin Data
  const { data: allTasks = [] } = useQuery({
    queryKey: ['allPendingTasks'],
    queryFn: () => base44.entities.StaffTask.filter({ 
      status: { $in: ['pending', 'in_progress'] }
    }),
    enabled: isManager || isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allForms = [] } = useQuery({
    queryKey: ['allPendingForms'],
    queryFn: () => base44.entities.FormAssignmentMetadata.filter({
      completion_status: { $in: ['pending', 'in_progress'] }
    }),
    enabled: isManager || isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventoryAlerts'],
    queryFn: async () => {
      const items = await base44.entities.Ingredient.list('', 100);
      return items.filter(item => 
        parseFloat(item.current_stock || 0) <= parseFloat(item.reorder_point || 0)
      );
    },
    enabled: isManager || isAdmin,
    staleTime: 10 * 60 * 1000,
  });

  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['todayQuality'],
    queryFn: async () => {
      const records = await base44.entities.QualityRecord.list('-created_date', 20);
      return records.filter(r => isToday(parseISO(r.created_date)));
    },
    enabled: isManager || isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // ========================================
  // COMPUTED METRICS
  // ========================================

  const kpis = useMemo(() => {
    if (isStaff) {
      return {
        myTasksCount: myTasks.length,
        myFormsCount: myForms.length,
        tasksCompleted: 0,
        myShiftStatus: myActiveShift ? 'active' : 'none',
      };
    }

    // Manager/Admin KPIs
    const avgQuality = qualityRecords.length > 0
      ? (qualityRecords.reduce((sum, r) => sum + r.score, 0) / qualityRecords.length).toFixed(1)
      : 0;

    const staffOnDuty = todayShifts.filter(s => s.status === 'in_progress').length;
    
    return {
      staffOnDuty,
      pendingTasks: allTasks.length,
      pendingForms: allForms.length,
      lowStockItems: inventory.length,
      avgQualityScore: avgQuality,
      totalShiftsToday: todayShifts.length,
      qualityChecksToday: qualityRecords.length,
    };
  }, [isStaff, myTasks, myForms, myActiveShift, allTasks, allForms, inventory, qualityRecords, todayShifts]);

  // ========================================
  // REFRESH HANDLER
  // ========================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchShifts(),
    ]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // ========================================
  // RENDER: STAFF VIEW
  // ========================================

  if (isStaff) {
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
                Welcome back, {user?.full_name?.split(' ')[0] || 'Team Member'}! 👋
              </h1>
              <p className="text-gray-600 mt-1">Here's your day at a glance</p>
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
                      <h3 className="text-3xl font-bold text-gray-900">{kpis.myTasksCount}</h3>
                      <p className="text-xs text-gray-500 mt-2">Pending completion</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pending Forms</p>
                      <h3 className="text-3xl font-bold text-gray-900">{kpis.myFormsCount}</h3>
                      <p className="text-xs text-gray-500 mt-2">Need completion</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <ClipboardCheck className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
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
                        {myActiveShift ? 'On Duty' : 'Off Duty'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-2">
                        {myActiveShift ? `Since ${myActiveShift.clock_in_time}` : 'Not clocked in'}
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

          {/* My Tasks List */}
          {myTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Today's Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <p className="text-sm text-gray-500">Due: {format(new Date(task.due_date), 'PPp')}</p>
                      </div>
                      <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
                {myTasks.length > 5 && (
                  <Link to={createPageUrl('MyTasks')}>
                    <Button variant="ghost" className="w-full mt-4">
                      View All Tasks
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: MANAGER/ADMIN VIEW
  // ========================================

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
                    <h3 className="text-3xl font-bold text-gray-900">{kpis.staffOnDuty}</h3>
                    <p className="text-xs text-gray-500 mt-2">of {kpis.totalShiftsToday} scheduled</p>
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
                    <p className="text-sm text-gray-600 mb-1">Pending Tasks</p>
                    <h3 className="text-3xl font-bold text-gray-900">{kpis.pendingTasks}</h3>
                    <p className="text-xs text-gray-500 mt-2">{kpis.pendingForms} forms pending</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <ClipboardCheck className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Low Stock Alert</p>
                    <h3 className="text-3xl font-bold text-gray-900">{kpis.lowStockItems}</h3>
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
                    <h3 className="text-3xl font-bold text-gray-900">{kpis.avgQualityScore}%</h3>
                    <p className="text-xs text-gray-500 mt-2">{kpis.qualityChecksToday} checks today</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

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
              {kpis.lowStockItems > 0 || kpis.pendingTasks > 10 ? (
                <div className="space-y-3">
                  {kpis.lowStockItems > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div>
                        <p className="font-medium text-red-900">Low Stock Items</p>
                        <p className="text-sm text-red-700">{kpis.lowStockItems} items need immediate reordering</p>
                      </div>
                      <Link to={createPageUrl('IngredientStock')}>
                        <Button size="sm" variant="destructive">
                          View
                        </Button>
                      </Link>
                    </div>
                  )}
                  {kpis.pendingTasks > 10 && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div>
                        <p className="font-medium text-yellow-900">High Task Backlog</p>
                        <p className="text-sm text-yellow-700">{kpis.pendingTasks} tasks pending completion</p>
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

          {/* Today's Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#014D40]" />
                Today's Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Staff Attendance</span>
                  <span className="font-medium">{kpis.staffOnDuty}/{kpis.totalShiftsToday}</span>
                </div>
                <Progress 
                  value={(kpis.staffOnDuty / kpis.totalShiftsToday) * 100} 
                  className="h-2"
                />

                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-600">Task Completion</span>
                  <span className="font-medium">
                    {kpis.pendingTasks > 0 ? 
                      `${kpis.pendingTasks} pending` : 
                      'All clear'}
                  </span>
                </div>
                <Progress 
                  value={kpis.pendingTasks > 0 ? 40 : 100} 
                  className="h-2"
                />

                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-600">Quality Standard</span>
                  <span className="font-medium">{kpis.avgQualityScore}%</span>
                </div>
                <Progress 
                  value={parseFloat(kpis.avgQualityScore)} 
                  className="h-2"
                />
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
              <Link to={createPageUrl('IngredientStock')}>
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
              {kpis.lowStockItems > 0 && (
                <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg backdrop-blur">
                  <Target className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Stock Optimization Needed</p>
                    <p className="text-sm opacity-90">
                      {kpis.lowStockItems} items below reorder point. Consider bulk ordering to save 15% on costs.
                    </p>
                  </div>
                </div>
              )}
              {kpis.avgQualityScore > 90 && (
                <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg backdrop-blur">
                  <Award className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Excellence Achievement</p>
                    <p className="text-sm opacity-90">
                      Your team is maintaining {kpis.avgQualityScore}% quality score. Great work!
                    </p>
                  </div>
                </div>
              )}
              {kpis.pendingTasks > 5 && (
                <div className="flex items-start gap-3 p-3 bg-white/10 rounded-lg backdrop-blur">
                  <Activity className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Task Distribution Suggestion</p>
                    <p className="text-sm opacity-90">
                      High task volume detected. Consider redistributing tasks among {kpis.staffOnDuty} staff on duty.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}