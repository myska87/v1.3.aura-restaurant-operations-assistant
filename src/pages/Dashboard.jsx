
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Clock,
  CheckCircle,
  Calendar,
  Users,
  Package,
  Star,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Activity,
  MessageCircle,
  FileText,
  Zap,
  ArrowRight,
  Sparkles, // Added Sparkles icon
  Mic, // Added Mic icon
  GraduationCap, // Added GraduationCap icon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const isManager = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';
  const isKitchen = ['chef', 'sous_chef', 'line_cook'].includes(user?.position?.toLowerCase());
  const isFrontOfHouse = ['server', 'bartender', 'host'].includes(user?.position?.toLowerCase());

  // Fetch my shifts
  const { data: myShifts = [] } = useQuery({
    queryKey: ['myShifts', user?.email],
    queryFn: () => base44.entities.Shift.filter({ 
      staff_email: user?.email,
      shift_date: { $gte: todayStr }
    }, 'shift_date', 10),
    enabled: !!user?.email,
  });

  // Fetch my tasks
  const { data: myTasks = [] } = useQuery({
    queryKey: ['myTasks', user?.email],
    queryFn: () => base44.entities.StaffTask.filter({
      assigned_to: user?.email,
      status: { $in: ['pending', 'in_progress'] }
    }, 'due_date', 20),
    enabled: !!user?.email,
  });

  // Fetch my forms
  const { data: myForms = [] } = useQuery({
    queryKey: ['myForms', user?.email],
    queryFn: () => base44.entities.FormAssignmentMetadata.filter({
      assigned_to_email: user?.email,
      completion_status: { $in: ['pending', 'in_progress'] }
    }, 'due_date', 20),
    enabled: !!user?.email,
  });

  // Fetch recent activities
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['recentActivities', user?.email],
    queryFn: async () => {
      if (isManager) {
        return await base44.entities.ActivityLog.list('-created_date', 10);
      }
      return await base44.entities.ActivityLog.filter(
        { user_email: user?.email },
        '-created_date',
        10
      );
    },
    enabled: !!user?.email,
  });

  // Manager-only stats
  const { data: allShifts = [] } = useQuery({
    queryKey: ['todayShifts', todayStr],
    queryFn: () => base44.entities.Shift.filter({ shift_date: todayStr }),
    enabled: isManager,
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: async () => {
      const ingredients = await base44.entities.Ingredient.list();
      return ingredients.filter(i => i.current_stock <= (i.reorder_point || 0));
    },
    enabled: isManager,
  });

  const activeShift = myShifts.find(s => s.status === 'in_progress');
  const todayShift = myShifts.find(s => s.shift_date === todayStr);
  const staffOnDuty = allShifts.filter(s => s.status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Welcome Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name || 'User'}! 👋
          </h1>
          <p className="text-gray-600">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Active Shift Banner */}
        {activeShift && (
          <div className="mb-6 animate-card-in card-hover">
            <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5" />
                      <span className="font-semibold text-lg">Currently Clocked In</span>
                    </div>
                    <p className="text-emerald-50">
                      {activeShift.role} • {activeShift.start_time} - {activeShift.end_time}
                    </p>
                  </div>
                  <Link to={createPageUrl('ClockInOut')}>
                    <Button variant="secondary" size="lg">
                      Clock Out
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Today's Shift (if not clocked in yet) */}
        {!activeShift && todayShift && (
          <div className="mb-6 animate-card-in card-hover">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5" />
                      <span className="font-semibold text-lg">Your Shift Today</span>
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
          </div>
        )}

        {/* AI Tools Quick Access - Managers Only */}
        {isManager && (
          <div className="mb-6 animate-card-in"> {/* Changed px-6 pb-4 to mb-6 for consistent spacing */}
            <Card className="bg-gradient-to-r from-purple-500 to-pink-600 border-none shadow-xl card-hover">
              <CardContent className="p-6">
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Tools & Automation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3"> {/* Adjusted grid for smaller screens */}
                  <Link to={createPageUrl('AIRotaGenerator')}>
                    <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30">
                      <Calendar className="w-4 h-4 mr-2" />
                      AI Scheduler
                    </Button>
                  </Link>
                  <Link to={createPageUrl('MeetingDashboard')}>
                    <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30">
                      <Mic className="w-4 h-4 mr-2" />
                      AI Meeting Notes
                    </Button>
                  </Link>
                  <Link to={createPageUrl('TrainingAcademy')}>
                    <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      AI Training Posts
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* KPI Cards - Role Specific */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* My Tasks - Everyone */}
          <Link to={createPageUrl('MyTasks')}>
            <Card className="bg-white border-none shadow-sm hover:shadow-lg transition-all cursor-pointer card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  My Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {myTasks.length}
                </div>
                <p className="text-xs text-gray-500">Pending tasks</p>
              </CardContent>
            </Card>
          </Link>

          {/* My Forms - Everyone */}
          <Link to={createPageUrl('FormLibrary')}>
            <Card className="bg-white border-none shadow-sm hover:shadow-lg transition-all cursor-pointer card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Forms Due
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {myForms.length}
                </div>
                <p className="text-xs text-gray-500">To complete</p>
              </CardContent>
            </Card>
          </Link>

          {/* My Shifts - Everyone */}
          <Link to={createPageUrl('MyShifts')}>
            <Card className="bg-white border-none shadow-sm hover:shadow-lg transition-all cursor-pointer card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  My Shifts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {myShifts.length}
                </div>
                <p className="text-xs text-gray-500">Upcoming shifts</p>
              </CardContent>
            </Card>
          </Link>

          {/* Manager: Staff on Duty - ONLY FOR MANAGERS */}
          {isManager && (
            <Link to={createPageUrl('StaffRota')}>
              <Card className="bg-white border-none shadow-sm hover:shadow-lg transition-all cursor-pointer card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    Staff On Duty
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {staffOnDuty}
                  </div>
                  <p className="text-xs text-gray-500">Currently working</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Manager: Low Stock */}
          {isManager && (
            <Link to={createPageUrl('InventoryDashboard')}>
              <Card className="bg-white border-none shadow-sm hover:shadow-lg transition-all cursor-pointer card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Package className="w-4 h-4 text-red-600" />
                    Low Stock
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {lowStockItems.length}
                  </div>
                  <p className="text-xs text-gray-500">Items need ordering</p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* Role-Specific Quick Actions */}
        <Card className="bg-white border-none shadow-sm mb-8 card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              
              {/* Everyone */}
              <Link to={createPageUrl('ClockInOut')}>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="w-4 h-4 mr-2" />
                  Clock In/Out
                </Button>
              </Link>
              <Link to={createPageUrl('MyTasks')}>
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  My Tasks
                </Button>
              </Link>
              <Link to={createPageUrl('TeamChat')}>
                <Button variant="outline" className="w-full justify-start">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Team Chat
                </Button>
              </Link>
              <Link to={createPageUrl('MyShifts')}>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  My Shifts
                </Button>
              </Link>

              {/* Managers ONLY */}
              {isManager && (
                <>
                  <Link to={createPageUrl('StaffRota')}>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      Staff Rota
                    </Button>
                  </Link>
                  <Link to={createPageUrl('ManagerDashboard')}>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Manager View
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Reports')}>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics
                    </Button>
                  </Link>
                  <Link to={createPageUrl('InventoryDashboard')}>
                    <Button variant="outline" className="w-full justify-start">
                      <Package className="w-4 h-4 mr-2" />
                      Inventory
                    </Button>
                  </Link>
                </>
              )}

              {/* Kitchen */}
              {isKitchen && (
                <>
                  <Link to={createPageUrl('Menu')}>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Menu
                    </Button>
                  </Link>
                  <Link to={createPageUrl('SOPDashboardHub')}>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      SOPs
                    </Button>
                  </Link>
                  <Link to={createPageUrl('QualityDashboard')}>
                    <Button variant="outline" className="w-full justify-start">
                      <Star className="w-4 h-4 mr-2" />
                      Quality
                    </Button>
                  </Link>
                  <Link to={createPageUrl('InventoryDashboard')}>
                    <Button variant="outline" className="w-full justify-start">
                      <Package className="w-4 h-4 mr-2" />
                      Stock
                    </Button>
                  </Link>
                </>
              )}

              {/* Front of House */}
              {isFrontOfHouse && (
                <>
                  <Link to={createPageUrl('DocumentsDashboard')}>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Documents
                    </Button>
                  </Link>
                  <Link to={createPageUrl('OnboardingTraining')}>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Training
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Priorities Today */}
        {(myTasks.length > 0 || myForms.length > 0) && (
          <Card className="bg-white border-none shadow-sm mb-8 card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Your Priorities Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Tasks */}
                {myTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{task.task_name}</p>
                        <p className="text-sm text-gray-600">Task • {task.category}</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-600 text-white">Task</Badge>
                  </div>
                ))}

                {/* Forms */}
                {myForms.slice(0, 3).map((form) => (
                  <div key={form.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">{form.form_name}</p>
                        <p className="text-sm text-gray-600">
                          Form • Due {format(new Date(form.due_date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-purple-600 text-white">Form</Badge>
                  </div>
                ))}

                {(myTasks.length > 3 || myForms.length > 3) && (
                  <div className="text-center pt-2">
                    <Link to={createPageUrl('MyTasks')}>
                      <Button variant="ghost" size="sm">
                        View All ({myTasks.length + myForms.length}) →
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Feed */}
        <Card className="bg-white border-none shadow-sm card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Recent Activity
            </CardTitle>
            <Badge variant="outline">Live</Badge>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="font-medium">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
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
