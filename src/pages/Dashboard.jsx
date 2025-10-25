
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Package,
  Wrench,
  Users,
  AlertTriangle,
  TrendingUp,
  GraduationCap,
  Calendar,
  Sparkles
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import ComplianceChart from "../components/dashboard/ComplianceChart";
import RecentActivity from "../components/dashboard/RecentActivity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

// Placeholder for SmartAlerts component - will likely fetch and display dynamic alerts
const SmartAlerts = () => {
  // This component would typically contain logic to fetch and render various alerts
  // based on real-time data, system status, or user roles.
  // For now, it returns null, meaning it won't render anything visually,
  // but it's available to be populated with alert logic in the future.
  return null;
};

export default function Dashboard() {
  const [dailyQuote, setDailyQuote] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(true);

  const { data: complianceChecks = [], isLoading: loadingCompliance } = useQuery({
    queryKey: ['complianceChecks'],
    queryFn: () => base44.entities.ComplianceCheck.list("-check_date", 100),
  });

  const { data: inventoryItems = [], isLoading: loadingInventory } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const { data: maintenanceTickets = [], isLoading: loadingMaintenance } = useQuery({
    queryKey: ['maintenanceTickets'],
    queryFn: () => base44.entities.MaintenanceTicket.list("-created_date"),
  });

  const { data: staffTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['staffTasks'],
    queryFn: () => base44.entities.StaffTask.list("-due_date", 50),
  });

  const { data: cultureContent = [], isLoading: loadingCulture } = useQuery({
    queryKey: ['cultureContent'],
    queryFn: () => base44.entities.CultureContent.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: upcomingChecklists = [] } = useQuery({
    queryKey: ['upcomingChecklists', user?.email],
    queryFn: async () => {
      if (!user?.email || (user.position !== 'manager' && user.position !== 'owner')) {
        return [];
      }

      try {
        // Fetch all checklist executions and templates
        const allExecutions = await base44.entities.ChecklistExecution.list('-execution_date');
        const templates = await base44.entities.ChecklistTemplate.list();

        const templatesMap = new Map(templates.map(t => [t.id, t]));

        const now = new Date();
        now.setHours(0, 0, 0, 0); // Normalize 'now' to the start of today
        const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        twoWeeksFromNow.setHours(23, 59, 59, 999); // Normalize 'twoWeeksFromNow' to end of day

        return allExecutions.filter(exec => {
          const template = templatesMap.get(exec.template_id);
          if (!template) return false;

          const execDate = new Date(exec.execution_date);
          execDate.setHours(0, 0, 0, 0); // Normalize 'execDate' to the start of its day

          const daysUntilDue = Math.ceil((execDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Filter for manager/owner-specific checklists that are due within 14 days and not completed
          return (
            template.applicable_roles?.includes(user.position) &&
            exec.status !== 'completed' &&
            exec.assigned_to_email === user.email &&
            execDate >= now && // Ensure it's not overdue
            execDate <= twoWeeksFromNow // Ensure it's within the next 14 days
          );
        });
      } catch (error) {
        console.error("Error fetching upcoming checklists:", error);
        return [];
      }
    },
    enabled: !!user?.email && (user?.position === 'manager' || user?.position === 'owner'),
  });

  // Get daily motivational quote
  useEffect(() => {
    const fetchDailyQuote = async () => {
      setLoadingQuote(true);

      // First, check if there's a daily quote in culture content
      const existingQuote = cultureContent.find(c => c.content_type === 'daily_quote');

      if (existingQuote) {
        setDailyQuote(existingQuote.content);
        setLoadingQuote(false);
      } else {
        // Only try to generate if culture content is loaded and no existing quote
        const today = new Date().toISOString().split('T')[0];
        const cachedQuote = localStorage.getItem('dailyQuote');
        const cachedDate = localStorage.getItem('dailyQuoteDate');

        if (cachedQuote && cachedDate === today) {
          setDailyQuote(cachedQuote);
          setLoadingQuote(false);
        } else {
          try {
            const response = await base44.integrations.Core.InvokeLLM({
              prompt: `Generate one inspiring and motivational quote about hospitality, customer service, or teamwork in the restaurant industry. Make it uplifting and positive. Return only the quote text without quotes or author attribution. Keep it under 100 characters.`,
            });

            const newQuote = typeof response === 'string' ? response : (response && response.quote) ? response.quote : "Excellence in hospitality starts with a smile and genuine care for every guest.";
            setDailyQuote(newQuote);
            localStorage.setItem('dailyQuote', newQuote);
            localStorage.setItem('dailyQuoteDate', today);
            setLoadingQuote(false);
          } catch (error) {
            console.error("Error generating quote:", error);
            setDailyQuote("Excellence in hospitality starts with a smile and genuine care for every guest.");
            setLoadingQuote(false);
          }
        }
      }
    };

    if (!loadingCulture) { // Trigger fetch when cultureContent is done loading
      fetchDailyQuote();
    }
  }, [cultureContent, loadingCulture]);

  // Calculate stats
  const complianceRate = complianceChecks.length > 0
    ? Math.round((complianceChecks.filter(c => c.status === "passed").length / complianceChecks.length) * 100)
    : 0;

  const lowStockItems = inventoryItems.filter(
    item => item.current_quantity <= (item.minimum_quantity || 0)
  ).length;

  const openTickets = maintenanceTickets.filter(t => t.status === "open").length;

  const pendingTasks = staffTasks.filter(t => t.status === "pending" || t.status === "in_progress").length;

  // Chart data
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
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

  // Recent activities
  const recentActivities = [
    ...complianceChecks.slice(0, 3).map(check => ({
      title: `${check.check_type.replace(/_/g, ' ')} - ${check.area}`,
      date: check.check_date,
      type: 'compliance'
    })),
    ...maintenanceTickets.slice(0, 2).map(ticket => ({
      title: ticket.title,
      date: ticket.created_date,
      type: 'maintenance'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Real-time restaurant operations overview</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">System Online</span>
          </div>
        </div>

        {/* Smart Alerts Section */}
        <SmartAlerts />

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
                {loadingQuote ? (
                  <div className="animate-pulse">
                    <div className="h-6 bg-white/20 rounded w-3/4 mb-2" />
                    <div className="h-6 bg-white/20 rounded w-full" />
                  </div>
                ) : (
                  <p className="text-2xl md:text-3xl font-bold leading-relaxed italic">
                    "{dailyQuote}"
                  </p>
                )}
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
                    {upcomingChecklists.map((checklist) => {
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

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link to={createPageUrl("StaffModel")}>
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <GraduationCap className="w-8 h-8" />
                      <h3 className="text-2xl font-bold">Staff Model</h3>
                    </div>
                    <p className="text-blue-100">Culture, Training, Performance & Recognition</p>
                  </div>
                  <div className="text-white group-hover:translate-x-2 transition-transform">
                    →
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("StaffRota")}>
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-8 h-8" />
                      <h3 className="text-2xl font-bold">Shift & Rota</h3>
                    </div>
                    <p className="text-green-100">Scheduling, Clock-In/Out & Attendance</p>
                  </div>
                  <div className="text-white group-hover:translate-x-2 transition-transform">
                    →
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
                      →
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Charts and Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ComplianceChart data={chartData} />
          </div>
          <div>
            <RecentActivity activities={recentActivities} isLoading={loadingCompliance} />
          </div>
        </div>
      </div>
    </div>
  );
}
