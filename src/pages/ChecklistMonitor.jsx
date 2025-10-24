
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CheckCircle, Clock, AlertTriangle, XCircle, Home } from "lucide-react"; // Added Home icon
import { format } from "date-fns";
import { Link } from "react-router-dom"; // Added Link for navigation
import { Button } from "@/components/ui/button"; // Added Button component

export default function ChecklistMonitor() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterShiftType, setFilterShiftType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: executions = [], isLoading } = useQuery({
    queryKey: ['checklistExecutions'],
    queryFn: () => base44.entities.ChecklistExecution.list('-execution_date'),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.User.list(),
  });

  const filteredExecutions = executions.filter(execution => {
    const matchesStatus = filterStatus === 'all' || execution.status === filterStatus;
    const matchesShift = filterShiftType === 'all' || execution.shift_type === filterShiftType;
    const matchesSearch = execution.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         execution.assigned_to_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesShift && matchesSearch;
  });

  const todayExecutions = executions.filter(e => 
    e.execution_date === format(new Date(), 'yyyy-MM-dd')
  );

  const stats = {
    total: todayExecutions.length,
    completed: todayExecutions.filter(e => e.status === 'completed').length,
    inProgress: todayExecutions.filter(e => e.status === 'in_progress').length,
    overdue: todayExecutions.filter(e => e.status === 'overdue').length,
    notStarted: todayExecutions.filter(e => e.status === 'not_started').length,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getShiftTypeColor = (shiftType) => {
    switch (shiftType) {
      case 'opening':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'mid_shift':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgress = (execution) => {
    if (!execution.tasks || execution.tasks.length === 0) return 0;
    const completed = execution.tasks.filter(t => 
      t.status === 'pass' || t.status === 'fail' || t.status === 'na'
    ).length;
    return Math.round((completed / execution.tasks.length) * 100);
  };

  // Assuming createPageUrl is a helper function that returns the path.
  // If it's not defined elsewhere, a placeholder or direct path is needed.
  // For this implementation, we will assume a direct path to '/dashboard'.
  const createPageUrl = (pageName) => {
    if (pageName === "Dashboard") return "/dashboard";
    // Add other page mappings if necessary
    return "/"; // Default fallback
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checklist Monitor</h1>
          <p className="text-gray-600">Real-time tracking of all checklist completions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-600">Total Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                  <p className="text-xs text-gray-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                  <p className="text-xs text-gray-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
                  <p className="text-xs text-gray-600">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.notStarted}</p>
                  <p className="text-xs text-gray-600">Not Started</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white border-none shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Search by checklist or staff name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:w-64"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterShiftType} onValueChange={setFilterShiftType}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Filter by shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="opening">Opening</SelectItem>
                  <SelectItem value="mid_shift">Mid-Shift</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Executions List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredExecutions.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No checklists found</p>
              </CardContent>
            </Card>
          ) : (
            filteredExecutions.map((execution) => {
              const progress = getProgress(execution);
              return (
                <Card key={execution.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900 mb-1">
                              {execution.template_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Assigned to: <span className="font-medium text-gray-900">{execution.assigned_to_name}</span>
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={getStatusColor(execution.status)}>
                              {execution.status.replace(/_/g, ' ')}
                            </Badge>
                            <Badge className={getShiftTypeColor(execution.shift_type)}>
                              {execution.shift_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium text-gray-900">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                          <p>Date: {format(new Date(execution.execution_date), 'PPP')}</p>
                          {execution.started_at && (
                            <p>Started: {format(new Date(execution.started_at), 'h:mm a')}</p>
                          )}
                          {execution.completed_at && (
                            <p className="text-green-600">
                              Completed: {format(new Date(execution.completed_at), 'h:mm a')}
                            </p>
                          )}
                          {execution.overall_pass_rate !== undefined && execution.overall_pass_rate !== null && (
                            <p>Pass Rate: <span className="font-medium">{execution.overall_pass_rate}%</span></p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
