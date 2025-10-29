
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle, AlertTriangle, Play, Home, CalendarDays, ClipboardList, TrendingUp } from "lucide-react"; // Added CalendarDays, ClipboardList, TrendingUp
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { safeNumber, safePercent } from '@/utils/safeNumber'; // Added
import LoadingSpinner from '../components/common/LoadingSpinner'; // Added
import EmptyState from '../components/common/EmptyState'; // Added

export default function MyChecklists() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Removed: const [currentShift, setCurrentShift] = useState(null);

  const [selectedStatus, setSelectedStatus] = useState('all'); // Added
  const [selectedShift, setSelectedShift] = useState('all'); // Added

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['myShifts', user?.email],
    queryFn: () => base44.entities.Shift.filter({
      staff_email: user?.email,
      shift_date: format(new Date(), 'yyyy-MM-dd')
    }),
    enabled: !!user?.email,
  });

  // Safe shift selection - handle empty array
  // Replaced useEffect and useState for currentShift with direct derivation
  const currentShift = shifts.length > 0
    ? (shifts.find(s => s.status === 'in_progress') || shifts[0])
    : null;

  // Removed: useEffect to set currentShift

  const { data: myChecklists = [], isLoading } = useQuery({
    queryKey: ['myChecklists', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];

      try {
        // Get ALL checklists assigned to this user (not just today)
        // Assuming base44.entities.ChecklistExecution.list can accept a sort parameter
        const allChecklists = await base44.entities.ChecklistExecution.list('-execution_date');
        return allChecklists.filter(c => c.assigned_to_email === user.email);
      } catch (error) {
        console.error("Error fetching checklists:", error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const getChecklistProgress = (checklist) => {
    if (!checklist.tasks || checklist.tasks.length === 0) return 0;
    const completedTasks = checklist.tasks.filter(t => t.status === 'pass' || t.status === 'fail' || t.status === 'na').length;
    return Math.round((completedTasks / checklist.tasks.length) * 100);
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
        return 'bg-green-500';
      case 'mid_shift':
        return 'bg-blue-500';
      case 'closing':
        return 'bg-purple-500';
      case 'any':
        return 'bg-indigo-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Removed: todayStr, overdueChecklists, inProgressChecklists, notStartedChecklists, completedChecklists, upcomingChecklists

  // Filter checklists with null safety
  const filteredChecklists = myChecklists.filter(checklist => {
    if (!checklist) return false;

    const matchesStatus = selectedStatus === 'all' || checklist.status === selectedStatus;
    const matchesShift = selectedShift === 'all' || checklist.shift_type === selectedShift;
    return matchesStatus && matchesShift;
  });

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Checklists</h1>
          <p className="text-gray-600">Complete your assigned checklists</p>
        </div>

        {/* Current Shift Info */}
        {currentShift && (
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-none shadow-lg mb-6">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-2">Current Shift</h3>
                  <div className="space-y-1">
                    <p className="flex items-center gap-2">
                      <Badge className={`${getShiftTypeColor(currentShift.shift_type)} text-white border-none`}>
                        {currentShift.shift_type.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <span>{currentShift.role}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {currentShift.start_time} - {currentShift.end_time}
                    </p>
                  </div>
                </div>
                {currentShift.status === 'in_progress' && (
                  <Badge className="bg-white text-blue-600 border-none">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
                    Active
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Removed Alerts section for overdue checklists */}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Checklists</h3>
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{myChecklists.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Completed</h3>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-700">
                {myChecklists.filter(c => c.status === 'completed').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Completion Rate</h3>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-700">
                {safePercent(
                  myChecklists.filter(c => c.status === 'completed').length,
                  myChecklists.length,
                  0
                ).toFixed(0)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Overdue</h3>
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-700">
                {myChecklists.filter(c => c.status === 'overdue').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Checklists List */}
        {isLoading ? (
          <LoadingSpinner message="Loading checklists..." />
        ) : filteredChecklists.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No checklists found"
            description={
              selectedStatus !== 'all'
                ? `No ${selectedStatus.replace(/_/g, ' ')} checklists found. Try changing filters.`
                : "You don't have any assigned checklists yet."
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChecklists.map(checklist => (
              <ChecklistCard
                key={checklist.id}
                checklist={checklist}
                progress={getChecklistProgress(checklist)}
                getStatusColor={getStatusColor}
                getShiftTypeColor={getShiftTypeColor}
                onStart={() => navigate(createPageUrl(`ExecuteChecklist?id=${checklist.id}`))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistCard({ checklist, progress, getStatusColor, getShiftTypeColor, onStart }) {
  return (
    <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {checklist.template_name}
          </CardTitle>
          {checklist.status === 'completed' && (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={`${getShiftTypeColor(checklist.shift_type)} text-white border-none`}>
            {checklist.shift_type?.replace(/_/g, ' ')}
          </Badge>
          <Badge className={getStatusColor(checklist.status)}>
            {checklist.status?.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-900">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="text-sm text-gray-600">
            <p className="font-medium">Due: {format(new Date(checklist.execution_date), 'PPP')}</p>
            <p className="mt-1">{checklist.tasks?.length || 0} tasks</p>
            {checklist.started_at && (
              <p className="text-xs mt-1">
                Started: {format(new Date(checklist.started_at), 'h:mm a')}
              </p>
            )}
            {checklist.completed_at && (
              <p className="text-xs text-green-600 mt-1">
                Completed: {format(new Date(checklist.completed_at), 'h:mm a')}
              </p>
            )}
          </div>

          <Button
            onClick={onStart}
            className="w-full"
            variant={checklist.status === 'completed' ? 'outline' : 'default'}
          >
            {checklist.status === 'completed' ? 'View Checklist' : progress > 0 ? 'Continue Checklist' : 'Start Checklist'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
