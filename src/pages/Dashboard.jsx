
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

  const { data: cultureContent = [] } = useQuery({
    queryKey: ['cultureContent'],
    queryFn: () => base44.entities.CultureContent.list(),
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
        // Generate a new daily quote using AI
        try {
          const today = new Date().toISOString().split('T')[0];
          const cachedQuote = localStorage.getItem('dailyQuote');
          const cachedDate = localStorage.getItem('dailyQuoteDate');
          
          if (cachedQuote && cachedDate === today) {
            setDailyQuote(cachedQuote);
          } else {
            const response = await base44.integrations.Core.InvokeLLM({
              prompt: `Generate one inspiring and motivational quote about hospitality, customer service, or teamwork in the restaurant industry. Make it uplifting and positive. Return only the quote text without quotes or author attribution. Keep it under 100 characters.`,
            });
            
            // Assuming response can be a string or an object with a 'quote' property
            const newQuote = typeof response === 'string' ? response : (response && response.quote) ? response.quote : "Excellence in hospitality starts with a smile and genuine care for every guest.";
            setDailyQuote(newQuote);
            localStorage.setItem('dailyQuote', newQuote);
            localStorage.setItem('dailyQuoteDate', today);
          }
        } catch (error) {
          console.error("Error generating quote:", error);
          setDailyQuote("Excellence in hospitality starts with a smile and genuine care for every guest.");
        }
      }
      setLoadingQuote(false);
    };

    // Only fetch if cultureContent data is loaded to prevent multiple LLM calls
    // if cultureContent is empty initially then populates.
    if (!loadingQuote && cultureContent !== undefined) { 
        fetchDailyQuote();
    }
    // The dependency array ensures this effect runs when cultureContent changes
    // or when the component mounts if cultureContent is already present.
  }, [cultureContent]); 

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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Compliance Rate"
            value={`${complianceRate}%`}
            subtitle={`${complianceChecks.length} checks this week`}
            icon={ClipboardCheck}
            color="bg-green-500"
            trend={{ positive: true, value: "+3%" }}
          />
          <StatCard
            title="Low Stock Items"
            value={lowStockItems}
            subtitle={`${inventoryItems.length} total items`}
            icon={Package}
            color="bg-orange-500"
          />
          <StatCard
            title="Open Tickets"
            value={openTickets}
            subtitle={`${maintenanceTickets.length} total tickets`}
            icon={Wrench}
            color="bg-red-500"
          />
          <StatCard
            title="Pending Tasks"
            value={pendingTasks}
            subtitle={`${staffTasks.length} total tasks`}
            icon={Users}
            color="bg-blue-500"
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
