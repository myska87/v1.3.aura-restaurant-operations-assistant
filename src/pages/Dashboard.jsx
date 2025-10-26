
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Package,
  Wrench,
  Users,
  AlertTriangle,
  GraduationCap,
  Calendar,
  Sparkles,
  Zap,
  LogIn,
  LogOut,
  CheckCircle,
  ListChecks,
  Clock,
  ArrowRight
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import ComplianceChart from "../components/dashboard/ComplianceChart";
import RecentActivity from "../components/dashboard/RecentActivity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import QuickBackupWidget from "../components/QuickBackupWidget"; // Added import

export default function Dashboard() {
  const [dailyQuote, setDailyQuote] = useState("");

  // OPTIMIZED: Limit queries to only recent data needed for dashboard
  const { data: complianceChecks = [] } = useQuery({
    queryKey: ['complianceChecks'],
    queryFn: () => base44.entities.ComplianceCheck.list("-check_date", 50), // Limit to 50
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => base44.entities.Ingredient.list("", 100), // Limit to 100
    staleTime: 5 * 60 * 1000,
  });

  const { data: maintenanceTickets = [] } = useQuery({
    queryKey: ['maintenanceTickets'],
    queryFn: () => base44.entities.MaintenanceTicket.list("-created_date", 30), // Limit to 30
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffTasks = [] } = useQuery({
    queryKey: ['staffTasks'],
    queryFn: () => base44.entities.StaffTask.list("-due_date", 30), // Limit to 30
    staleTime: 5 * 60 * 1000,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Fetch user's checklists
  const { data: myChecklists = [] } = useQuery({
    queryKey: ['myChecklistsDashboard', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const allChecklists = await base44.entities.ChecklistExecution.list('-execution_date', 50);
      
      return allChecklists.filter(c => {
        const execDate = new Date(c.execution_date);
        execDate.setHours(0, 0, 0, 0);
        
        return (
          c.assigned_to_email === user.email &&
          c.status !== 'completed' &&
          execDate >= today &&
          execDate <= sevenDaysFromNow
        );
      }).slice(0, 5); // Show max 5 upcoming checklists
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  // OPTIMIZED: Only fetch today's shifts
  const today = new Date().toISOString().split('T')[0];
  const { data: myShifts = [] } = useQuery({
    queryKey: ['myTodayShifts', user?.email, today],
    queryFn: () => base44.entities.Shift.filter({
      staff_email: user?.email,
      shift_date: today
    }),
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  const activeShift = myShifts.find(s => s.status === 'in_progress');
  const nextShift = !activeShift ? myShifts.find(s => s.status === 'scheduled') : undefined;

  // OPTIMIZED: Only fetch for managers, with limits
  const { data: upcomingChecklists = [] } = useQuery({
    queryKey: ['upcomingChecklists', user?.email],
    queryFn: async () => {
      if (!user?.email || (user.position !== 'manager' && user.position !== 'owner')) {
        return [];
      }

      try {
        const allExecutions = await base44.entities.ChecklistExecution.list('-execution_date', 50); // Limit
        const templates = await base44.entities.ChecklistTemplate.list("", 20); // Limit

        const templatesMap = new Map(templates.map(t => [t.id, t]));

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        twoWeeksFromNow.setHours(23, 59, 59, 999);

        return allExecutions.filter(exec => {
          const template = templatesMap.get(exec.template_id);
          if (!template) return false;

          const execDate = new Date(exec.execution_date);
          execDate.setHours(0, 0, 0, 0);

          const daysUntilDue = Math.ceil((execDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          return (
            template.applicable_roles?.includes(user.position) &&
            exec.status !== 'completed' &&
            exec.assigned_to_email === user.email &&
            execDate >= now &&
            execDate <= twoWeeksFromNow
          );
        });
      } catch (error) {
        console.error("Error fetching upcoming checklists:", error);
        return [];
      }
    },
    enabled: !!user?.email && (user?.position === 'manager' || user?.position === 'owner'),
    staleTime: 5 * 60 * 1000,
  });

  // OPTIMIZED: Load quote from cache immediately, no AI generation
  useEffect(() => {
    const loadQuote = () => {
      const today = new Date().toISOString().split('T')[0];
      const cachedQuote = localStorage.getItem('dailyQuote');
      const cachedDate = localStorage.getItem('dailyQuoteDate');

      if (cachedQuote && cachedDate === today) {
        setDailyQuote(cachedQuote);
      } else {
        // Use default quote if cache expired
        const defaultQuote = "Excellence in hospitality starts with a smile and genuine care for every guest.";
        setDailyQuote(defaultQuote);
        localStorage.setItem('dailyQuote', defaultQuote);
        localStorage.setItem('dailyQuoteDate', today);
      }
    };

    loadQuote();
  }, []);

  // Calculate stats
  const complianceRate = complianceChecks.length > 0
    ? Math.round((complianceChecks.filter(c => c.status === "passed").length / complianceChecks.length) * 100)
    : 0;

  const lowStockItems = inventoryItems.filter(
    item => (item.current_stock || 0) <= (item.reorder_point || 0)
  ).length;

  const openTickets = maintenanceTickets.filter(t => t.status === "open").length;

  const pendingTasks = staffTasks.filter(t => t.status === "pending" || t.status === "in_progress").length;

  // Chart data - Only last 7 days
  const todayDate = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(todayDate);
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const chartData = last7Days.map(date => {
    const dayChecks = complianceChecks.filter(check => {
      const checkDate = new Date(check.check_date);
      return checkDate.toDateString() === date.toDateString();
    });

    return {
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      passed: dayChecks.filter(c => c.status === "passed").length,
      failed: dayChecks.filter(c => c.status === "failed" || c.status === "needs_attention").length,
    };
  });

  // Recent activities - Only top 5
  const recentActivities = [
    ...complianceChecks.slice(0, 3).map(check => ({
      title: `${check.check_type.replace(/_/g, ' ')} - ${check.area}`,
      date: check.check_date,
      activity_type: 'compliance'
    })),
    ...maintenanceTickets.slice(0, 2).map(ticket => ({
      title: ticket.title,
      date: ticket.created_date,
      activity_type: 'maintenance'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#014D40] via-emerald-600 to-[#E0B037] flex items-center justify-center shadow-xl">
              <svg
                viewBox="0 0 24 24"
                className="w-9 h-9 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
                <line x1="6" y1="17" x2="18" y2="17" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#014D40] to-emerald-600 bg-clip-text text-transparent mb-2">
                Dashboard
              </h1>
              <p className="text-gray-600">Real-time restaurant operations overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">System Online</span>
          </div>
        </div>

        {/* Daily Motivational Quote */}
        <Card className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-none shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white/90 mb-2">✨ DAILY INSPIRATION</p>
                <p className="text-2xl md:text-3xl font-bold leading-relaxed italic">
                  "{dailyQuote}"
                </p>
                <p className="text-sm text-white/80 mt-3">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manager Upcoming Tasks Alert */}
        {upcomingChecklists.length > 0 && (user?.position === 'manager' || user?.position === 'owner') && (
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">
                    📋 Upcoming Manager Tasks
                  </h3>
                  <p className="text-sm text-orange-800 mb-3">
                    You have {upcomingChecklists.length} checklist(s) due within the next 2 weeks
                  </p>
                  <div className="space-y-2">
                    {upcomingChecklists.slice(0, 3).map((checklist) => {
                      const todayDate = new Date();
                      todayDate.setHours(0,0,0,0);
                      const execDate = new Date(checklist.execution_date);
                      execDate.setHours(0,0,0,0);

                      const daysUntil = Math.ceil(
                        (execDate.getTime() - todayDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                      );

                      return (
                        <div key={checklist.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{checklist.template_name}</p>
                            <p className="text-sm text-gray-600 flex items-center mt-1 sm:mt-0">
                              Due: {format(new Date(checklist.execution_date), 'PPP')}
                              {daysUntil === 0 && (
                                <Badge className="ml-2 bg-red-100 text-red-800 hover:bg-red-100">
                                  Due Today
                                </Badge>
                              )}
                              {daysUntil > 0 && daysUntil <= 3 && (
                                <Badge className="ml-2 bg-red-100 text-red-800 hover:bg-red-100">
                                  {daysUntil} day{daysUntil > 1 ? 's' : ''} left
                                </Badge>
                              )}
                              {daysUntil > 3 && daysUntil <= 7 && (
                                <Badge className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                  {daysUntil} days left
                                </Badge>
                              )}
                              {daysUntil > 7 && daysUntil <= 14 && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                                  {daysUntil} days left
                                </Badge>
                              )}
                            </p>
                          </div>
                          <Link to={createPageUrl(`ExecuteChecklist?id=${checklist.id}`)}>
                            <Button size="sm" variant="outline" className="mt-2 sm:mt-0">
                              View
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                  {upcomingChecklists.length > 3 && (
                    <p className="text-sm text-orange-700 mt-2">
                      +{upcomingChecklists.length - 3} more checklists
                    </p>
                  )}
                  <Link to={createPageUrl('AdvancedChecklists')}>
                    <Button className="mt-4 bg-orange-600 hover:bg-orange-700 text-white">
                      View All Checklists
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {(lowStockItems > 0 || openTickets > 0) && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {lowStockItems > 0 && `${lowStockItems} items need reordering. `}
              {openTickets > 0 && `${openTickets} maintenance tickets require attention.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8"> {/* Changed from lg:grid-cols-4 and mt-6 */}
          <StatCard
            title="Compliance Rate"
            value={`${complianceRate}%`}
            subtitle={`${complianceChecks.length} checks this week`}
            icon={ClipboardCheck}
            color="bg-green-500"
            trend={{ positive: true, value: "+3%" }}
            link={createPageUrl("Compliance")}
          />
          <StatCard
            title="Low Stock Items"
            value={lowStockItems}
            subtitle={`${inventoryItems.length} total items`}
            icon={Package}
            color="bg-orange-500"
            link={createPageUrl("InventoryManagement")}
          />
          <StatCard
            title="Open Tickets"
            value={openTickets}
            subtitle={`${maintenanceTickets.length} total tickets`}
            icon={Wrench}
            color="bg-red-500"
            link={createPageUrl("Maintenance")}
          />
          <StatCard
            title="Pending Tasks"
            value={pendingTasks}
            subtitle={`${staffTasks.length} total tasks`}
            icon={Users}
            color="bg-blue-500"
            link={createPageUrl("AdvancedChecklists")}
          />
        </div>

        {/* Quick Backup Widget for Manager Dashboard (includes managers, owners, admins) */}
        {(user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin') && (
          <div className="mb-8">
            <QuickBackupWidget />
          </div>
        )}

        {/* Quick Actions */}
        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-yellow-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {activeShift ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <p className="font-semibold text-blue-900">Currently Clocked In</p>
                  </div>
                  <p className="text-sm text-blue-700">
                    {activeShift.role} • Started at {activeShift.clock_in_time ? format(new Date(activeShift.clock_in_time), 'h:mm a') : activeShift.start_time}
                  </p>
                </div>
                
                <Link to={createPageUrl('ClockInOut')} className="block">
                  <Button className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all">
                    <LogOut className="w-5 h-5 mr-2" />
                    Clock Out
                  </Button>
                </Link>

                <Link to={createPageUrl('MyTasks')} className="block">
                  <Button variant="outline" className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    View My Tasks
                  </Button>
                </Link>
              </div>
            ) : nextShift ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <p className="font-semibold text-green-900 mb-1">Next Shift</p>
                  <p className="text-sm text-green-700">
                    {nextShift.role}
                  </p>
                  <p className="text-sm text-green-700">
                    {nextShift.start_time} - {nextShift.end_time}
                  </p>
                </div>
                
                <Link to={createPageUrl('ClockInOut')} className="block">
                  <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all">
                    <LogIn className="w-5 h-5 mr-2" />
                    Clock In
                  </Button>
                </Link>

                <Link to={createPageUrl('MyShifts')} className="block">
                  <Button variant="outline" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    View My Schedule
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 text-center">
                  <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No shifts scheduled today</p>
                </div>

                <Link to={createPageUrl('MyShifts')} className="block">
                  <Button variant="outline" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    View My Schedule
                  </Button>
                </Link>

                <Link to={createPageUrl('MyTasks')} className="block">
                  <Button variant="outline" className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    View My Tasks
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* My Checklists Card */}
          <Link to={createPageUrl("MyChecklists")}>
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <ListChecks className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">My Checklists</h3>
                      <p className="text-blue-100 text-sm">Upcoming tasks & checklists</p>
                    </div>
                  </div>
                  <div className="text-white group-hover:translate-x-2 transition-transform">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>

                {/* Checklist Summary */}
                <div className="space-y-3 mt-4">
                  {myChecklists.length === 0 ? (
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-70" />
                      <p className="text-sm">All caught up! No pending checklists</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                        <span className="text-sm font-medium">Upcoming Checklists</span>
                        <Badge className="bg-white text-blue-600 hover:bg-white">
                          {myChecklists.length}
                        </Badge>
                      </div>

                      {/* Show next 3 checklists */}
                      {myChecklists.slice(0, 3).map((checklist) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const execDate = new Date(checklist.execution_date);
                        execDate.setHours(0, 0, 0, 0);
                        
                        const daysUntil = Math.ceil(
                          (execDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                        );

                        return (
                          <div key={checklist.id} className="bg-white/10 rounded-lg p-3 hover:bg-white/20 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{checklist.template_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="w-3 h-3" />
                                  <span className="text-xs opacity-90">
                                    {daysUntil === 0 ? 'Due Today' : 
                                     daysUntil === 1 ? 'Due Tomorrow' : 
                                     `Due in ${daysUntil} days`}
                                  </span>
                                </div>
                              </div>
                              {checklist.status === 'in_progress' && (
                                <Badge className="bg-yellow-400 text-yellow-900 text-xs">
                                  In Progress
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {myChecklists.length > 3 && (
                        <p className="text-xs text-center opacity-75 mt-2">
                          +{myChecklists.length - 3} more checklist{myChecklists.length - 3 > 1 ? 's' : ''}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Staff Model Card */}
          <Link to={createPageUrl("StaffModel")}>
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <GraduationCap className="w-8 h-8" />
                      <h3 className="text-2xl font-bold">Staff Model</h3>
                    </div>
                    <p className="text-green-100">Culture, Training, Performance & Recognition</p>
                  </div>
                  <div className="text-white group-hover:translate-x-2 transition-transform">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Smart Scheduler Quick Access for Managers */}
        {(user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin') && (
          <div className="mt-6">
            <Link to={createPageUrl("SmartScheduler")}>
              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-8 h-8" />
                        <h3 className="text-2xl font-bold">🤖 Smart Gantt Scheduler</h3>
                      </div>
                      <p className="text-purple-100">Visual week planner with automatic task assignment</p>
                    </div>
                    <div className="text-white group-hover:translate-x-2 transition-transform">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Charts and Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ComplianceChart data={chartData} />
          </div>
          <div>
            <RecentActivity activities={recentActivities} isLoading={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
