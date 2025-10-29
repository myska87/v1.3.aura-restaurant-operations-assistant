import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  ClipboardCheck,
  FileText,
  Shield,
  Package,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  ArrowRight,
  Home,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";

export default function ManagerDashboard() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState("today");
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["allShifts"],
    queryFn: () => base44.entities.Shift.list("-shift_date", 100),
  });

  const { data: staffTasks = [] } = useQuery({
    queryKey: ["allStaffTasks"],
    queryFn: () => base44.entities.StaffTask.list("-due_date", 100),
  });

  const { data: formAssignments = [] } = useQuery({
    queryKey: ["allFormAssignments"],
    queryFn: () => base44.entities.FormAssignmentMetadata.list("-due_date", 100),
  });

  const { data: complianceChecks = [] } = useQuery({
    queryKey: ["allComplianceChecks"],
    queryFn: () => base44.entities.ComplianceCheck.list("-check_date", 50),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["allInventoryItems"],
    queryFn: () => base44.entities.Ingredient.list("", 100),
  });

  const { data: managerAlerts = [] } = useQuery({
    queryKey: ["managerAlerts"],
    queryFn: () => base44.entities.ManagerAlert.filter({ status: "unread" }),
  });

  const safeFormatDate = (date, formatStr = 'PPP') => {
    if (!date) return 'N/A';
    try {
      const parsedDate = typeof date === 'string' ? parseISO(date) : new Date(date);
      if (isNaN(parsedDate.getTime())) return 'Invalid Date';
      return format(parsedDate, formatStr);
    } catch (error) {
      console.error('Date formatting error:', error, date);
      return 'Invalid Date';
    }
  };

  const safeFormatTime = (time) => {
    if (!time) return 'N/A';
    try {
      if (typeof time === 'string' && time.includes(':')) {
        return time;
      }
      const parsedTime = typeof time === 'string' ? parseISO(time) : new Date(time);
      if (isNaN(parsedTime.getTime())) return 'Invalid Time';
      return format(parsedTime, 'h:mm a');
    } catch (error) {
      console.error('Time formatting error:', error, time);
      return 'Invalid Time';
    }
  };

  const safeNumber = (value, decimals = 0) => {
    const num = parseFloat(value);
    return isNaN(num) || num === null || num === undefined ? 0 : parseFloat(num.toFixed(decimals));
  };

  const stats = {
    pendingTasks: staffTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    pendingForms: formAssignments.filter(f => f.completion_status === 'pending' || f.completion_status === 'in_progress').length,
    complianceRate: complianceChecks.length > 0 
      ? Math.round((complianceChecks.filter(c => c.status === 'passed').length / complianceChecks.length) * 100)
      : 0,
    lowStockItems: inventoryItems.filter(item => 
      safeNumber(item.current_stock) <= safeNumber(item.reorder_point)
    ).length,
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayShifts = shifts.filter(s => s.shift_date === todayStr);

  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId) => base44.entities.ManagerAlert.update(alertId, {
      status: 'acknowledged',
      acknowledged_by: user?.email,
      acknowledged_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerAlerts'] });
      setShowAlertDetails(false);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#014D40] to-emerald-600 bg-clip-text text-transparent mb-2">
              Manager Dashboard
            </h1>
            <p className="text-gray-600 text-lg">Central command for restaurant operations</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-100 text-green-800 px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
              All Systems Online
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Link to={createPageUrl("StaffRota")}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="cursor-pointer hover:scale-105 transition-transform"
            >
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg hover:shadow-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8" />
                    <Badge className="bg-white/20 text-white border-white/30">
                      Today
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold mb-1">{todayShifts.length}</p>
                  <p className="text-blue-100 text-sm">Active Shifts</p>
                </CardContent>
              </Card>
            </motion.div>
          </Link>

          <Link to={createPageUrl("MyTasks")}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="cursor-pointer hover:scale-105 transition-transform"
            >
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg hover:shadow-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-8 h-8" />
                    <Badge className="bg-white/20 text-white border-white/30">
                      Pending
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold mb-1">{stats.pendingTasks}</p>
                  <p className="text-green-100 text-sm">Open Tasks</p>
                </CardContent>
              </Card>
            </motion.div>
          </Link>

          <Link to={createPageUrl("FormIntelligence")}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="cursor-pointer hover:scale-105 transition-transform"
            >
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg hover:shadow-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-8 h-8" />
                    <Badge className="bg-white/20 text-white border-white/30">
                      Due
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold mb-1">{stats.pendingForms}</p>
                  <p className="text-purple-100 text-sm">Pending Forms</p>
                </CardContent>
              </Card>
            </motion.div>
          </Link>

          <Link to={createPageUrl("Compliance")}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="cursor-pointer hover:scale-105 transition-transform"
            >
              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg hover:shadow-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="w-8 h-8" />
                    <Badge className="bg-white/20 text-white border-white/30">
                      Rate
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold mb-1">{stats.complianceRate}%</p>
                  <p className="text-amber-100 text-sm">Compliance</p>
                </CardContent>
              </Card>
            </motion.div>
          </Link>

          <Link to={createPageUrl("InventoryManagement")}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="cursor-pointer hover:scale-105 transition-transform"
            >
              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none shadow-lg hover:shadow-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Package className="w-8 h-8" />
                    <Badge className="bg-white/20 text-white border-white/30">
                      Low
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold mb-1">{stats.lowStockItems}</p>
                  <p className="text-red-100 text-sm">Low Stock</p>
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        </div>

        {managerAlerts.length > 0 && (
          <Card className="border-l-4 border-l-amber-500 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-5 h-5" />
                Manager Alerts ({managerAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {managerAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedAlert(alert);
                      setShowAlertDetails(true);
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{alert.message}</p>
                      <p className="text-sm text-gray-600">
                        {alert.staff_name} - {safeFormatTime(alert.actual_time)}
                      </p>
                    </div>
                    <Badge className={
                      alert.severity === 'urgent' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'warning' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Today's Shifts</span>
                <Link to={createPageUrl("StaffRota")}>
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayShifts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No shifts scheduled for today</p>
              ) : (
                <div className="space-y-3">
                  {todayShifts.slice(0, 5).map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{shift.staff_name}</p>
                        <p className="text-sm text-gray-600">{shift.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{shift.start_time} - {shift.end_time}</p>
                        <Badge className={
                          shift.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                          shift.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {shift.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Compliance</span>
                <Link to={createPageUrl("Compliance")}>
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {complianceChecks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No compliance checks yet</p>
              ) : (
                <div className="space-y-3">
                  {complianceChecks.slice(0, 5).map((check) => (
                    <div key={check.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{check.check_type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-600">{check.area}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {check.status === 'passed' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="text-sm">{safeFormatDate(check.check_date, 'MMM d')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={showAlertDetails} onOpenChange={setShowAlertDetails}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alert Details</DialogTitle>
            </DialogHeader>
            {selectedAlert && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Staff Member</p>
                  <p className="font-medium">{selectedAlert.staff_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Alert Type</p>
                  <Badge className={
                    selectedAlert.severity === 'urgent' ? 'bg-red-100 text-red-800' :
                    selectedAlert.severity === 'warning' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {selectedAlert.alert_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Message</p>
                  <p className="font-medium">{selectedAlert.message}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="font-medium">{safeFormatTime(selectedAlert.actual_time)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">{selectedAlert.location?.name || 'N/A'}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAlertDetails(false)}>
                Close
              </Button>
              <Button onClick={() => selectedAlert && acknowledgeAlertMutation.mutate(selectedAlert.id)}>
                Acknowledge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}