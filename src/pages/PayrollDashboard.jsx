
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Removed useMutation
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Removed Input as it's replaced by Select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// New imports for charts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  DollarSign,
  Users,
  Clock,
  TrendingUp, // This is not used in the outline, but was in original, keeping for now
  // Removed CheckCircle, AlertTriangle
  Download,
  Home,
  Calendar, // Still used in navigation for 'Weekly Reports' or similar
  CreditCard, // Not used in new navigation from outline, removed
  ArrowLeft, // Imported in outline, but not explicitly used in provided snippets. Not adding as it's not used.
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfWeek, endOfWeek, getISOWeek, eachWeekOfInterval, addWeeks } from 'date-fns'; // Added eachWeekOfInterval, addWeeks
import { motion } from 'framer-motion'; // Kept from original, might not be used if record list is removed. It is used.
import { safeNumber, toSafeNumber } from '@/utils/safeNumber'; // Added safeNumber, toSafeNumber (safeCurrency not used)

export default function PayrollDashboard() {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // Initialize selectedWeek to the current ISO week number
    const today = new Date();
    return getISOWeek(today).toString();
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  const { data: payrollRecords = [], isLoading } = useQuery({
    queryKey: ['payrollRecords', selectedWeek], // Key now depends on selectedWeek number
    queryFn: async () => {
      // Fetch records by week_number, not date range
      return await base44.entities.PayrollRecord.filter({
        week_number: parseInt(selectedWeek),
        // Additional filters if needed, e.g., year
      });
    },
    enabled: !!selectedWeek, // Only run query if a week is selected
  });

  // Removed approvePayrollMutation as per outline implies it's no longer present

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">Payroll Dashboard is only accessible to Administrators.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate totals - WITH SAFE NUMBERS
  // Filter payrollRecords based on the selected week number (from the state)
  const currentWeekRecords = payrollRecords.filter(r => r.week_number?.toString() === selectedWeek);
  
  const totalGrossPay = currentWeekRecords.reduce((sum, r) => sum + toSafeNumber(r.total_gross_pay), 0);
  const totalNetPay = currentWeekRecords.reduce((sum, r) => sum + toSafeNumber(r.total_net_pay), 0);
  const totalHours = currentWeekRecords.reduce((sum, r) => sum + toSafeNumber(r.total_hours), 0);
  const totalOvertimeHours = currentWeekRecords.reduce((sum, r) => sum + toSafeNumber(r.overtime_hours), 0);

  // Department breakdown - WITH SAFE NUMBERS
  const departmentData = currentWeekRecords.reduce((acc, record) => {
    const dept = record.department || 'Unassigned'; // Default to 'Unassigned' if department is null
    const existing = acc.find(d => d.name === dept);
    
    if (existing) {
      existing.total += toSafeNumber(record.total_net_pay);
      existing.hours += toSafeNumber(record.total_hours);
    } else {
      acc.push({
        name: dept,
        total: toSafeNumber(record.total_net_pay, 0),
        hours: toSafeNumber(record.total_hours, 0),
      });
    }
    return acc;
  }, []);

  // Weekly trend - WITH SAFE NUMBERS
  // Generate a list of recent week numbers (e.g., last 8 weeks)
  const currentYear = new Date().getFullYear();
  const allWeekNumbersInQuery = [...new Set(payrollRecords.map(r => r.week_number))];
  
  // Get unique week numbers from all fetched payroll records, sort them, and take the last 8
  const weekNumbersForSelect = Array.from(new Set(allWeekNumbersInQuery))
    .sort((a, b) => a - b);
  
  const weeklyTrend = weekNumbersForSelect.slice(-8).map(weekNum => { // Only consider the last 8 for trend
    const weekRecords = payrollRecords.filter(r => r.week_number === weekNum);
    return {
      week: `Week ${weekNum}`,
      total: toSafeNumber(weekRecords.reduce((sum, r) => sum + toSafeNumber(r.total_net_pay), 0), 0),
      hours: toSafeNumber(weekRecords.reduce((sum, r) => sum + toSafeNumber(r.total_hours), 0), 0),
    };
  });


  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Navigation - Modified as per outline's implicit change */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('WeeklyPayrollReport')}>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Weekly Reports
            </Button>
          </Link>
          <Link to={createPageUrl('StaffWagesReport')}>
            <Button variant="outline" size="sm">
              <DollarSign className="w-4 h-4 mr-2" /> {/* Changed icon from CreditCard to DollarSign for staff wages */}
              Staff Wages
            </Button>
          </Link>
        </div>

        {/* Header - Modified as per outline */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payroll Dashboard</h1>
            <p className="text-gray-600">Weekly payroll summary and reports</p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {weekNumbersForSelect.map(weekNum => (
                  <SelectItem key={weekNum} value={weekNum.toString()}>
                    Week {weekNum}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link to={createPageUrl('WeeklyPayrollReport')}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards - WITH SAFE NUMBERS */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Gross Pay</p>
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-blue-600">£{safeNumber(totalGrossPay, 2)}</p>
              <p className="text-xs text-gray-500 mt-1">Week {selectedWeek}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Net Pay</p>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-600">£{safeNumber(totalNetPay, 2)}</p>
              <p className="text-xs text-gray-500 mt-1">Week {selectedWeek}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Hours</p>
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{safeNumber(totalHours, 1)}h</p>
              <p className="text-xs text-gray-500 mt-1">{safeNumber(totalOvertimeHours, 1)}h overtime</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Staff Count</p>
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-amber-600">{currentWeekRecords.length}</p>
              <p className="text-xs text-gray-500 mt-1">Active Staff</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts - based on data calculated in outline */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle>Department Payroll Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                    <XAxis dataKey="name" tickFormatter={(value) => value.length > 10 ? value.substring(0, 10) + '...' : value} />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip formatter={(value, name, props) => {
                      if (name === 'total') return `£${safeNumber(value, 2)}`;
                      if (name === 'hours') return `${safeNumber(value, 1)}h`;
                      return value;
                    }} />
                    <Bar yAxisId="left" dataKey="total" name="Net Pay" fill="#8884d8" barSize={20} />
                    <Bar yAxisId="right" dataKey="hours" name="Total Hours" fill="#82ca9d" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-6 text-gray-500">No department data for this week.</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle>Weekly Payroll Trend (Last 8 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                    <XAxis dataKey="week" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip formatter={(value, name, props) => {
                      if (name === 'total') return `£${safeNumber(value, 2)}`;
                      if (name === 'hours') return `${safeNumber(value, 1)}h`;
                      return value;
                    }} />
                    <Bar yAxisId="left" dataKey="total" name="Net Pay" fill="#8884d8" barSize={20} />
                    <Bar yAxisId="right" dataKey="hours" name="Total Hours" fill="#82ca9d" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-6 text-gray-500">No trend data available.</div>
              )}
            </CardContent>
          </Card>
        </div>


        {/* Staff Breakdown Table */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <CardTitle>Staff Payroll Breakdown - Week {selectedWeek}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payroll...</p>
              </div>
            ) : currentWeekRecords.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No payroll records for this week</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Staff</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Hours</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Overtime</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Gross Pay</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Deductions</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Net Pay</th>
                      <th className="text-center p-3 text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentWeekRecords.map((record, index) => {
                      const totalDeductions = toSafeNumber(record.deductions?.late_penalties) +
                        toSafeNumber(record.deductions?.uniform) +
                        toSafeNumber(record.deductions?.other);

                      return (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-3">
                            <p className="font-medium text-gray-900">{record.staff_name}</p>
                            <p className="text-xs text-gray-600">{record.role}</p>
                          </td>
                          <td className="p-3 text-center text-sm">{safeNumber(record.total_hours, 1)}h</td>
                          <td className="p-3 text-center text-sm">{safeNumber(record.overtime_hours, 1)}h</td>
                          <td className="p-3 text-right text-sm font-semibold">£{safeNumber(record.total_gross_pay, 2)}</td>
                          <td className="p-3 text-right text-sm text-red-600">-£{safeNumber(totalDeductions, 2)}</td>
                          <td className="p-3 text-right text-sm font-bold text-green-600">£{safeNumber(record.total_net_pay, 2)}</td>
                          <td className="p-3 text-center">
                            <Badge className={
                              record.status === 'paid' ? 'bg-green-100 text-green-800' :
                              record.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              record.status === 'verified' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {record.status}
                            </Badge>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
