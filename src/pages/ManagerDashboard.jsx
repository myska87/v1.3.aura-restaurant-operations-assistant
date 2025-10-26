import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  ClipboardCheck,
  AlertTriangle,
  Calendar,
  DollarSign,
  Package,
  Wrench,
  ArrowLeft,
  Home,
  Shield
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import ManagerAlertsWidget from "../components/ManagerAlertsWidget";
import QuickBackupWidget from "../components/QuickBackupWidget";

export default function ManagerDashboard() {
  const [timeRange, setTimeRange] = useState('week');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['allShifts'],
    queryFn: () => base44.entities.Shift.list('-shift_date', 100),
    staleTime: 2 * 60 * 1000,
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['managerChecklists'],
    queryFn: () => base44.entities.ChecklistExecution.list('-execution_date', 100),
    staleTime: 2 * 60 * 1000,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['maintenanceTickets'],
    queryFn: () => base44.entities.MaintenanceTicket.list('-created_date', 50),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => base44.entities.Ingredient.list("", 100),
    staleTime: 5 * 60 * 1000,
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  if (!isManager) {
    return (
      <div className="p-6 md:p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-6">
              Only managers and owners can access this dashboard.
            </p>
            <Link to={createPageUrl("Dashboard")}>
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeStaff = teamMembers.filter(m => m.status === 'active').length;
  const todayShifts = shifts.filter(s => s.shift_date === new Date().toISOString().split('T')[0]);
  const pendingChecklists = checklists.filter(c => c.status === 'not_started' || c.status === 'in_progress').length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const lowStockItems = ingredients.filter(i => (i.current_stock || 0) <= (i.reorder_point || 0)).length;

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-gray-600">Overview of operations and team performance</p>
            </div>
          </div>
        </div>

        {/* Quick Backup Widget - Manager Only Feature */}
        <QuickBackupWidget />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Staff</p>
                  <p className="text-2xl font-bold text-gray-900">{activeStaff}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today's Shifts</p>
                  <p className="text-2xl font-bold text-gray-900">{todayShifts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ClipboardCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingChecklists}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Wrench className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Open Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{openTickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manager Alerts */}
        <ManagerAlertsWidget />

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link to={createPageUrl("SmartScheduler")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                  <h3 className="font-semibold text-lg">Smart Scheduler</h3>
                </div>
                <p className="text-sm text-gray-600">AI-powered shift planning</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Reports")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-lg">Reports & Analytics</h3>
                </div>
                <p className="text-sm text-gray-600">Business intelligence insights</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("DataManagement")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-lg">Data Management</h3>
                </div>
                <p className="text-sm text-gray-600">Backups, exports & security</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}