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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Download,
  Filter,
  Calendar,
  Users,
  ArrowLeft,
  Home,
  Eye,
  CheckSquare,
  XCircle,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, parseISO, differenceInMinutes } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AttendanceReports() {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Fetch attendance records
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendanceRecords', selectedWeek],
    queryFn: async () => {
      const weekStart = startOfWeek(parseISO(selectedWeek), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(parseISO(selectedWeek), { weekStartsOn: 1 });
      
      return await base44.entities.AttendanceRecord.list('-shift_date');
    },
    enabled: isManager,
  });

  // Verify attendance mutation
  const verifyAttendanceMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return await base44.entities.AttendanceRecord.update(id, {
        status: 'verified',
        verified_by: user.email,
        verified_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
    },
  });

  const flagForReviewMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.AttendanceRecord.update(id, {
        flagged_for_review: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
    },
  });

  if (!isManager) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Access Restricted</h3>
            <p className="text-red-700">This page is only accessible to managers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const totalRecords = attendanceRecords.length;
  const onTimeRecords = attendanceRecords.filter(r => r.status === 'on_time').length;
  const lateRecords = attendanceRecords.filter(r => r.status === 'late').length;
  const missingClockOuts = attendanceRecords.filter(r => r.status === 'missing_clock_out').length;
  const totalOvertime = attendanceRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
  const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0);

  // Filter records
  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.staff_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || record.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'on_time':
        return <Badge className="bg-green-100 text-green-800">✅ On Time</Badge>;
      case 'late':
        return <Badge className="bg-red-100 text-red-800">⚠️ Late</Badge>;
      case 'verified':
        return <Badge className="bg-blue-100 text-blue-800">✓ Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pending</Badge>;
      case 'missing_clock_out':
        return <Badge className="bg-orange-100 text-orange-800">❌ Missing Clock Out</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ['Staff Name', 'Date', 'Role', 'Department', 'Scheduled Start', 'Scheduled End', 'Clock In', 'Clock Out', 'Total Hours', 'Overtime', 'Status'],
      ...filteredRecords.map(r => [
        r.staff_name,
        r.shift_date,
        r.role || '',
        r.department || '',
        r.scheduled_start,
        r.scheduled_end,
        r.actual_clock_in ? format(parseISO(r.actual_clock_in), 'HH:mm') : '',
        r.actual_clock_out ? format(parseISO(r.actual_clock_out), 'HH:mm') : '',
        r.total_hours?.toFixed(2) || '',
        r.overtime_hours?.toFixed(2) || '',
        r.status
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("ManagerDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Manager Dashboard
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
          <h1 className="text-4xl font-bold text-gray-900 mb-3">⏰ Attendance & Hours</h1>
          <p className="text-lg text-gray-600">Monitor staff attendance and working hours</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
              <p className="text-xs text-gray-600">Total Records</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{onTimeRecords}</p>
              <p className="text-xs text-gray-600">On Time</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{lateRecords}</p>
              <p className="text-xs text-gray-600">Late Clock-Ins</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalOvertime.toFixed(1)}h</p>
              <p className="text-xs text-gray-600">Total Overtime</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{missingClockOuts}</p>
              <p className="text-xs text-gray-600">Missing Clock-Outs</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-wrap justify-between items-center gap-4">
              <CardTitle>Attendance Records</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-6">
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="front_of_house">Front of House</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="on_time">On Time</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="missing_clock_out">Missing Clock-Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.staff_name}</p>
                          <p className="text-xs text-gray-500">{record.staff_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{format(parseISO(record.shift_date), 'MMM d')}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{record.scheduled_start} - {record.scheduled_end}</p>
                          <p className="text-xs text-gray-500">{record.scheduled_hours?.toFixed(1)}h</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.actual_clock_in ? (
                          <div>
                            <p className="text-sm">{format(parseISO(record.actual_clock_in), 'HH:mm')}</p>
                            {record.lateness_minutes > 0 && (
                              <p className="text-xs text-red-600">+{record.lateness_minutes} min</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.actual_clock_out ? (
                          <div>
                            <p className="text-sm">{format(parseISO(record.actual_clock_out), 'HH:mm')}</p>
                            {record.early_departure_minutes > 0 && (
                              <p className="text-xs text-orange-600">-{record.early_departure_minutes} min</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.total_hours ? (
                          <div>
                            <p className="font-medium">{record.total_hours.toFixed(1)}h</p>
                            {record.overtime_hours > 0 && (
                              <p className="text-xs text-purple-600">+{record.overtime_hours.toFixed(1)}h OT</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {record.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => verifyAttendanceMutation.mutate({ id: record.id })}
                              className="h-8 w-8"
                            >
                              <CheckSquare className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => flagForReviewMutation.mutate(record.id)}
                            className="h-8 w-8"
                          >
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredRecords.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No attendance records found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}