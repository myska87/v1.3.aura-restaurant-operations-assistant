import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Download,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileText,
  ArrowLeft,
  Home,
} from "lucide-react";
import { format, startOfWeek, addDays, getWeek, addWeeks, subWeeks, parseISO, differenceInMinutes } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function WeeklyPayrollReport() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [overtimeRate, setOvertimeRate] = useState(1.5);

  const weekNumber = getWeek(currentWeekStart);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const weekEnd = addDays(currentWeekStart, 6);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  // Get all attendance records for the week
  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ['weeklyAttendance', format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const allRecords = await base44.entities.AttendanceRecord.list('-shift_date');
      
      return allRecords.filter(record => {
        const recordDate = parseISO(record.shift_date);
        return recordDate >= currentWeekStart && recordDate <= weekEnd;
      });
    },
  });

  // Get all staff members
  const { data: allStaff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.list(),
  });

  // Get team members with department info
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  // Calculate staff hours
  const staffHoursData = React.useMemo(() => {
    const staffMap = new Map();

    attendanceRecords.forEach(record => {
      if (!record.actual_clock_in || !record.actual_clock_out) return;

      const staff = allStaff.find(s => s.email === record.staff_email);
      const teamMember = teamMembers.find(tm => tm.staff_email === record.staff_email);
      
      if (!staff) return;

      // Filter by department if selected
      if (selectedDepartment !== 'all' && teamMember?.department !== selectedDepartment) return;

      if (!staffMap.has(record.staff_email)) {
        staffMap.set(record.staff_email, {
          email: record.staff_email,
          name: record.staff_name || staff.full_name,
          position: teamMember?.position || staff.position || 'Staff',
          department: teamMember?.department || 'N/A',
          hourly_rate: teamMember?.hourly_rate || 0,
          total_hours: 0,
          regular_hours: 0,
          overtime_hours: 0,
          total_shifts: 0,
          late_count: 0,
          early_departure_count: 0,
          perfect_attendance: 0,
          daily_breakdown: {},
        });
      }

      const staffData = staffMap.get(record.staff_email);
      
      // Add hours
      const totalHours = record.total_hours || 0;
      const overtimeHours = record.overtime_hours || 0;
      const regularHours = totalHours - overtimeHours;
      
      staffData.total_hours += totalHours;
      staffData.regular_hours += regularHours;
      staffData.overtime_hours += overtimeHours;
      staffData.total_shifts += 1;
      
      if (record.lateness_minutes > 5) staffData.late_count += 1;
      if (record.early_departure_minutes > 5) staffData.early_departure_count += 1;
      if (record.lateness_minutes <= 5 && record.early_departure_minutes <= 5) {
        staffData.perfect_attendance += 1;
      }

      // Daily breakdown
      const day = format(parseISO(record.shift_date), 'EEE');
      if (!staffData.daily_breakdown[day]) {
        staffData.daily_breakdown[day] = 0;
      }
      staffData.daily_breakdown[day] += totalHours;
    });

    return Array.from(staffMap.values()).sort((a, b) => b.total_hours - a.total_hours);
  }, [attendanceRecords, allStaff, teamMembers, selectedDepartment]);

  // Calculate totals
  const totals = React.useMemo(() => {
    return staffHoursData.reduce((acc, staff) => {
      acc.totalHours += staff.total_hours;
      acc.regularHours += staff.regular_hours;
      acc.overtimeHours += staff.overtime_hours;
      acc.totalShifts += staff.total_shifts;
      acc.totalStaff += 1;
      
      // Calculate pay if hourly rate exists
      if (staff.hourly_rate > 0) {
        const regularPay = staff.regular_hours * staff.hourly_rate;
        const overtimePay = staff.overtime_hours * staff.hourly_rate * overtimeRate;
        acc.totalPay += regularPay + overtimePay;
      }
      
      return acc;
    }, {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      totalShifts: 0,
      totalStaff: 0,
      totalPay: 0,
    });
  }, [staffHoursData, overtimeRate]);

  const handlePreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const exportToCSV = () => {
    const headers = [
      'Staff Name',
      'Position',
      'Department',
      'Total Hours',
      'Regular Hours',
      'Overtime Hours',
      'Shifts Worked',
      'Late Count',
      'Hourly Rate',
      'Regular Pay',
      'Overtime Pay',
      'Total Pay',
      ...weekDates.map(d => format(d, 'EEE dd/MM'))
    ];

    const rows = staffHoursData.map(staff => {
      const regularPay = staff.regular_hours * staff.hourly_rate;
      const overtimePay = staff.overtime_hours * staff.hourly_rate * overtimeRate;
      const totalPay = regularPay + overtimePay;

      return [
        staff.name,
        staff.position,
        staff.department,
        staff.total_hours.toFixed(2),
        staff.regular_hours.toFixed(2),
        staff.overtime_hours.toFixed(2),
        staff.total_shifts,
        staff.late_count,
        staff.hourly_rate.toFixed(2),
        regularPay.toFixed(2),
        overtimePay.toFixed(2),
        totalPay.toFixed(2),
        ...weekDates.map(d => {
          const day = format(d, 'EEE');
          return (staff.daily_breakdown[day] || 0).toFixed(1);
        })
      ];
    });

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      '',
      totals.totalHours.toFixed(2),
      totals.regularHours.toFixed(2),
      totals.overtimeHours.toFixed(2),
      totals.totalShifts,
      '',
      '',
      '',
      '',
      totals.totalPay.toFixed(2),
    ]);

    const csvContent = [
      [`Weekly Payroll Report - Week ${weekNumber} (${format(currentWeekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')})`],
      [],
      headers,
      ...rows
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-week-${weekNumber}-${format(currentWeekStart, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isManager) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Access Restricted</h3>
            <p className="text-red-700">This page is only accessible to managers and owners.</p>
            <Link to={createPageUrl("Dashboard")}>
              <Button className="mt-4">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("ManagerDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Manager Dashboard
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
          <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center gap-3">
            <DollarSign className="w-10 h-10 text-green-600" />
            Weekly Payroll Report
          </h1>
          <p className="text-lg text-gray-600">
            Staff hours and payroll calculation for Week {weekNumber}
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6 bg-white border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Week Navigation */}
              <div className="flex-1 min-w-[300px]">
                <Label className="mb-2 block">Select Week</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold text-gray-900">Week {weekNumber}</p>
                    <p className="text-sm text-gray-600">
                      {format(currentWeekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
                    </p>
                  </div>
                  <Button variant="outline" size="icon" onClick={handleNextWeek}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Department Filter */}
              <div className="w-[200px]">
                <Label className="mb-2 block">Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="front_of_house">Front of House</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Overtime Rate */}
              <div className="w-[150px]">
                <Label className="mb-2 block">Overtime Rate</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={overtimeRate}
                  onChange={(e) => setOvertimeRate(parseFloat(e.target.value) || 1.5)}
                  placeholder="1.5"
                />
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold mb-1">{totals.totalHours.toFixed(1)}h</p>
                <p className="text-sm text-blue-100">Total Hours</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold mb-1">{totals.regularHours.toFixed(1)}h</p>
                <p className="text-sm text-green-100">Regular Hours</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold mb-1">{totals.overtimeHours.toFixed(1)}h</p>
                <p className="text-sm text-orange-100">Overtime Hours</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold mb-1">{totals.totalStaff}</p>
                <p className="text-sm text-purple-100">Staff Members</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold mb-1">£{totals.totalPay.toFixed(0)}</p>
                <p className="text-sm text-emerald-100">Total Payroll</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Staff Hours Table */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Staff Hours Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading attendance records...</p>
              </div>
            ) : staffHoursData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No attendance records found for this week</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Staff Member</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Position</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Total Hours</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Regular</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Overtime</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Shifts</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Late</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Rate</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Total Pay</th>
                      {weekDates.map((date, i) => (
                        <th key={i} className="text-center p-3 text-sm font-semibold text-gray-700">
                          {format(date, 'EEE')}<br />
                          <span className="text-xs text-gray-500">{format(date, 'dd/MM')}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staffHoursData.map((staff, index) => {
                      const regularPay = staff.regular_hours * staff.hourly_rate;
                      const overtimePay = staff.overtime_hours * staff.hourly_rate * overtimeRate;
                      const totalPay = regularPay + overtimePay;
                      const hasPerfectAttendance = staff.late_count === 0 && staff.early_departure_count === 0;

                      return (
                        <motion.tr
                          key={staff.email}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-gray-900">{staff.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{staff.department}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs capitalize">
                              {staff.position.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-3 text-center font-bold text-gray-900">
                            {staff.total_hours.toFixed(1)}h
                          </td>
                          <td className="p-3 text-center text-green-700">
                            {staff.regular_hours.toFixed(1)}h
                          </td>
                          <td className="p-3 text-center text-orange-700">
                            {staff.overtime_hours.toFixed(1)}h
                          </td>
                          <td className="p-3 text-center">
                            {staff.total_shifts}
                          </td>
                          <td className="p-3 text-center">
                            {staff.late_count > 0 ? (
                              <Badge className="bg-red-100 text-red-800">
                                {staff.late_count}
                              </Badge>
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {staff.hourly_rate > 0 ? (
                              `£${staff.hourly_rate.toFixed(2)}`
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {staff.hourly_rate > 0 ? (
                              <div>
                                <p className="font-bold text-gray-900">£{totalPay.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">
                                  Reg: £{regularPay.toFixed(2)} | OT: £{overtimePay.toFixed(2)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          {weekDates.map((date, i) => {
                            const day = format(date, 'EEE');
                            const hours = staff.daily_breakdown[day] || 0;
                            return (
                              <td key={i} className="p-3 text-center">
                                {hours > 0 ? (
                                  <span className="text-sm font-medium text-gray-900">
                                    {hours.toFixed(1)}h
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            );
                          })}
                        </motion.tr>
                      );
                    })}
                    
                    {/* Totals Row */}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                      <td className="p-3" colSpan="2">TOTALS</td>
                      <td className="p-3 text-center text-blue-700">{totals.totalHours.toFixed(1)}h</td>
                      <td className="p-3 text-center text-green-700">{totals.regularHours.toFixed(1)}h</td>
                      <td className="p-3 text-center text-orange-700">{totals.overtimeHours.toFixed(1)}h</td>
                      <td className="p-3 text-center">{totals.totalShifts}</td>
                      <td className="p-3 text-center">-</td>
                      <td className="p-3 text-center">-</td>
                      <td className="p-3 text-right text-green-700">£{totals.totalPay.toFixed(2)}</td>
                      {weekDates.map((date, i) => {
                        const day = format(date, 'EEE');
                        const dayTotal = staffHoursData.reduce((sum, staff) => {
                          return sum + (staff.daily_breakdown[day] || 0);
                        }, 0);
                        return (
                          <td key={i} className="p-3 text-center text-blue-700">
                            {dayTotal > 0 ? `${dayTotal.toFixed(1)}h` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Report Notes
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Hours are calculated from actual clock-in and clock-out times</li>
              <li>• Overtime hours calculated at {overtimeRate}x rate</li>
              <li>• Late arrivals marked in red (>5 minutes after scheduled start)</li>
              <li>• Staff without hourly rates will show "N/A" for pay calculations</li>
              <li>• Export to CSV for use in payroll systems</li>
              <li>• Unverified attendance records may need manager review</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
          }
          button {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}