import React from 'react';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function DashboardPro() {
  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Determine role
  const isAdmin = user?.role === 'admin';
  const isManager = user?.position === 'manager' || user?.position === 'owner';
  const isStaff = !isAdmin && !isManager;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
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

        {/* Recent Activity */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <CardTitle>Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {shifts.length === 0 && tasks.length === 0 && forms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No activity scheduled for today</p>
                <p className="text-sm mt-2">Check back tomorrow or view your upcoming schedule</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {pendingTasks} task{pendingTasks !== 1 ? 's' : ''} pending
                      </p>
                      <p className="text-sm text-gray-600">Complete your assigned tasks</p>
                    </div>
                  </div>
                )}
                {pendingForms > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                    <Star className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {pendingForms} form{pendingForms !== 1 ? 's' : ''} due
                      </p>
                      <p className="text-sm text-gray-600">Fill out required forms</p>
                    </div>
                  </div>
                )}
                {!myActiveShift && shifts.some(s => s.staff_email === user?.email) && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-gray-900">Shift scheduled today</p>
                      <p className="text-sm text-gray-600">Remember to clock in on time</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}