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
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Filter,
  ArrowLeft,
  Home,
  Eye,
  Check,
  X,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function AttendanceReports() {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const weekStart = format(selectedWeek, 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendanceRecords', weekStart, weekEnd],
    queryFn: async () => {
      const records = await base44.entities.AttendanceRecord.list('-shift_date');
      return records.filter(r => r.shift_date >= weekStart && r.shift_date <= weekEnd);
    },
    enabled: isManager,
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AttendanceRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
    },
  });

  const handleVerify = async (record) => {
    await updateAttendanceMutation.mutateAsync({
      id: record.id,
      data: {
        status: 'verified',
        verified_by: user?.email,
        verified_at: new Date().toISOString(),
      }
    });
  };

  const handleReject = async (record) => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;

    await updateAttendanceMutation.mutateAsync({
      id: record.id,
      data: {
        flagged_for_review: true,
        notes: reason,
        verified_by: user?.email,
        verified_at: new Date().toISOString(),
      }
    });
  };

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

  // Calculate stats
  const totalRecords = attendanceRecords.length;
  const onTimeRecords = attendanceRecords.filter(r => r.status === 'on_time').length;
  const lateRecords = attendanceRecords.filter(r => r.status === 'late').length;
  const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0);
  const totalOvertime = attendanceRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
  const pendingVerification = attendanceRecords.filter(r => r.status === 'pending' || r.flagged_for_review).length;

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
        return <Badge className="bg-green-100 text-green-800">On Time</Badge>;
      case 'late':
        return <Badge className="bg-red-100 text-red-800">Late</Badge>;
      case 'early':
        return <Badge className="bg-blue-100 text-blue-800">Early</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ['AURA Attendance Report', `Week: ${weekStart} to ${weekEnd}`],
      [''],
      ['Staff Name', 'Role', 'Date', 'Scheduled Start', 'Scheduled End', 'Clock In', 'Clock Out', 'Total Hours', 'Overtime', 'Status', 'Lateness (min)'],
      ...filteredRecords.map(record => [
        record.staff_name,
        record.role || '',
        record.shift_date,
        record.scheduled_start,
        record.scheduled_end,
        record.actual_clock_in ? format(parseISO(record.actual_clock_in), 'HH:mm') : 'N/A',
        record.actual_clock_out ? format(parseISO(record.actual_clock_out), 'HH:mm') : 'N/A',
        record.total_hours?.toFixed(2) || '0',
        record.overtime_hours?.toFixed(2) || '0',
        record.status,
        record.lateness_minutes || '0'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${weekStart}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("ManagerDashboard")}>
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Clock className="w-10 h-10" style={{color: '#014D40'}} />
            Attendance & Hours Report
          </h1>
          <p className="text-gray-600">
            Week: {format(selectedWeek, 'MMM d')} - {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="border-l-4" style={{borderLeftColor: '#014D40'}}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8" style={{color: '#014D40'}} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalRecords}</p>
              <p className="text-xs text-gray-600 mt-1">Total Records</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{onTimeRecords}</p>
              <p className="text-xs text-gray-600 mt-1">On Time</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{lateRecords}</p>
              <p className="text-xs text-gray-600 mt-1">Late Clock-Ins</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalOvertime.toFixed(1)}h</p>
              <p className="text-xs text-gray-600 mt-1">Overtime</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{pendingVerification}</p>
              <p className="text-xs text-gray-600 mt-1">Pending Review</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="front_of_house">Front of House</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="on_time">On Time</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.staff_name}</TableCell>
                      <TableCell className="capitalize">{record.role || 'N/A'}</TableCell>
                      <TableCell>{format(parseISO(record.shift_date), 'MMM d')}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {record.scheduled_start} - {record.scheduled_end}
                      </TableCell>
                      <TableCell>
                        {record.actual_clock_in ? (
                          <div>
                            <p className="font-medium">{format(parseISO(record.actual_clock_in), 'HH:mm')}</p>
                            {record.lateness_minutes > 0 && (
                              <p className="text-xs text-red-600">+{record.lateness_minutes} min</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.actual_clock_out ? (
                          format(parseISO(record.actual_clock_out), 'HH:mm')
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.total_hours?.toFixed(1) || '0'}h</p>
                          {record.overtime_hours > 0 && (
                            <p className="text-xs text-purple-600">+{record.overtime_hours.toFixed(1)}h OT</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {record.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleVerify(record)}
                                className="h-8 w-8 text-green-600 hover:bg-green-50"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReject(record)}
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {record.flagged_for_review && (
                            <Badge className="bg-red-100 text-red-800 text-xs">Flagged</Badge>
                          )}
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