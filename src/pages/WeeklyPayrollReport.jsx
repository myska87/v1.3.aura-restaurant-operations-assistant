import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Home,
  Download,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Safe number helper
const safeNumber = (value, decimals = 2) => {
  const num = parseFloat(value);
  return isNaN(num) || num === null || num === undefined ? 0 : parseFloat(num.toFixed(decimals));
};

export default function WeeklyPayrollReport() {
  const [selectedWeek, setSelectedWeek] = useState(format(new Date(), 'yyyy-MM-dd'));

  const weekStart = startOfWeek(parseISO(selectedWeek), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(parseISO(selectedWeek), { weekStartsOn: 1 });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Access control check
  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const { data: attendanceRecords = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendanceRecords', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const records = await base44.entities.AttendanceRecord.list('-shift_date');
      return records.filter(record => {
        // Ensure shift_date is a valid string before parsing
        if (!record.shift_date || typeof record.shift_date !== 'string') return false;
        const recordDate = parseISO(record.shift_date);
        // Check for Invalid Date
        if (isNaN(recordDate.getTime())) return false;
        return recordDate >= weekStart && recordDate <= weekEnd;
      });
    },
  });

  const { data: wageRates = [], isLoading: isLoadingWageRates } = useQuery({
    queryKey: ['wageRates'],
    queryFn: () => base44.entities.WageRate.list(),
  });

  const staffPayrollData = React.useMemo(() => {
    const payrollMap = {};

    attendanceRecords.forEach(record => {
      if (!record.actual_clock_in || !record.actual_clock_out) return; // Skip incomplete records

      const staffEmail = record.staff_email;
      const staffName = record.staff_name;

      if (!payrollMap[staffEmail]) {
        payrollMap[staffEmail] = {
          staff_email: staffEmail,
          staff_name: staffName,
          total_hours: 0,
          regular_hours: 0,
          overtime_hours: 0,
          total_pay: 0,
          shifts: []
        };
      }

      const hoursWorked = safeNumber(record.total_hours, 2);
      const wageRateEntry = wageRates.find(w => w.staff_email === staffEmail);
      const hourlyRate = safeNumber(wageRateEntry?.hourly_rate, 2);

      // Use record's specified regular/overtime hours
      const recordRegularHours = safeNumber(record.regular_hours, 2);
      const recordOvertimeHours = safeNumber(record.overtime_hours, 2);

      const regularPay = recordRegularHours * hourlyRate;
      const overtimePay = recordOvertimeHours * hourlyRate * 1.5;
      const totalShiftPay = regularPay + overtimePay;

      payrollMap[staffEmail].total_hours += hoursWorked;
      payrollMap[staffEmail].regular_hours += recordRegularHours;
      payrollMap[staffEmail].overtime_hours += recordOvertimeHours;
      payrollMap[staffEmail].total_pay += totalShiftPay;
      payrollMap[staffEmail].hourly_rate = hourlyRate;
      payrollMap[staffEmail].shifts.push({
        date: record.shift_date,
        hours: hoursWorked,
        pay: totalShiftPay,
        regular_hours: recordRegularHours,
        overtime_hours: recordOvertimeHours,
      });
    });

    return Object.values(payrollMap).sort((a, b) => b.total_pay - a.total_pay);
  }, [attendanceRecords, wageRates]);

  // Calculate totals using staffPayrollData directly
  const totalPayroll = staffPayrollData.reduce((sum, staff) => sum + safeNumber(staff.total_pay, 2), 0);
  const totalHours = staffPayrollData.reduce((sum, staff) => sum + safeNumber(staff.total_hours, 2), 0);

  const exportToCSV = () => {
    const headers = [
      'Staff Name',
      'Email',
      'Hourly Rate',
      'Total Hours',
      'Regular Hours',
      'Overtime Hours',
      'Total Pay',
      'Regular Pay',
      'Overtime Pay'
    ];
    const rows = staffPayrollData.map(staff => [
      staff.staff_name,
      staff.staff_email,
      safeNumber(staff.hourly_rate, 2).toFixed(2),
      safeNumber(staff.total_hours, 2).toFixed(2),
      safeNumber(staff.regular_hours, 2).toFixed(2),
      safeNumber(staff.overtime_hours, 2).toFixed(2),
      `£${safeNumber(staff.total_pay, 2).toFixed(2)}`,
      `£${(safeNumber(staff.regular_hours, 2) * safeNumber(staff.hourly_rate, 2)).toFixed(2)}`,
      `£${(safeNumber(staff.overtime_hours, 2) * safeNumber(staff.hourly_rate, 2) * 1.5).toFixed(2)}`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-week-${format(weekStart, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!isManager) {
    return (
      <div className="p-6 md:p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
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

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Weekly Payroll Report</h1>
            <p className="text-gray-600">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
          <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="mb-6">
          <Label htmlFor="week-selector">Select Week</Label>
          <Input
            id="week-selector"
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {isLoadingAttendance || isLoadingWageRates ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading payroll data...</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="text-2xl font-bold">{staffPayrollData.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-500" />
                    <span className="text-2xl font-bold">{totalHours.toFixed(1)}h</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Payroll</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <span className="text-2xl font-bold">£{totalPayroll.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg per Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                    <span className="text-2xl font-bold">
                      £{staffPayrollData.length > 0 ? (totalPayroll / staffPayrollData.length).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {staffPayrollData.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No attendance records found for this week for payroll calculation.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {staffPayrollData.map((staff) => (
                  <Card key={staff.staff_email}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{staff.staff_name}</h3>
                          <p className="text-sm text-gray-600">{staff.staff_email}</p>
                          <p className="text-xs text-gray-500">Hourly Rate: £{safeNumber(staff.hourly_rate, 2).toFixed(2)}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 text-lg px-4 py-1">
                          £{safeNumber(staff.total_pay, 2).toFixed(2)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-600">Total Hours</p>
                          <p className="text-lg font-bold">{safeNumber(staff.total_hours, 2).toFixed(2)}h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Regular Hours</p>
                          <p className="text-lg font-bold text-blue-700">{safeNumber(staff.regular_hours, 2).toFixed(2)}h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Overtime Hours</p>
                          <p className="text-lg font-bold text-orange-700">{safeNumber(staff.overtime_hours, 2).toFixed(2)}h</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Shifts this week:</p>
                        <div className="space-y-1">
                          {staff.shifts.map((shift, idx) => (
                            <div key={`${staff.staff_email}-${shift.date}-${idx}`} className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                {format(parseISO(shift.date), 'EEE, MMM d')}
                              </span>
                              <span className="text-gray-900">
                                {safeNumber(shift.hours, 2).toFixed(2)}h (R: {safeNumber(shift.regular_hours, 1).toFixed(1)}h, OT: {safeNumber(shift.overtime_hours, 1).toFixed(1)}h) - £{safeNumber(shift.pay, 2).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}