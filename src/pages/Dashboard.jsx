import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  ClipboardCheck, 
  Package, 
  Wrench, 
  Users,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import ComplianceChart from "../components/dashboard/ComplianceChart";
import RecentActivity from "../components/dashboard/RecentActivity";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
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