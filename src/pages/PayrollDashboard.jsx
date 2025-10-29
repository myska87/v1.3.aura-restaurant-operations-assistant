
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, TrendingUp, Download, ArrowLeft, Home, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl, safeNumber, toSafeNumber, safeCurrency } from '@/utils';
import { format, startOfWeek, endOfWeek, getISOWeek } from 'date-fns';

export default function PayrollDashboard() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    return getISOWeek(today).toString();
  });

  const { data: payrollRecords = [], isLoading } = useQuery({
    queryKey: ['payrollRecords'],
    queryFn: () => base44.entities.PayrollRecord.list('-period_start'),
  });

  const currentWeekRecords = payrollRecords.filter(r => r.week_number?.toString() === selectedWeek);
  
  const totalGrossPay = currentWeekRecords.reduce((sum, r) => sum + toSafeNumber(r.total_gross_pay), 0);
  const totalNetPay = currentWeekRecords.reduce((sum, r) => sum + toSafeNumber(r.total_net_pay), 0);
  const totalHours = currentWeekRecords.reduce((sum, r) => sum + toSafeNumber(r.total_hours), 0);
  const totalOvertimeHours = currentWeekRecords.reduce((sum, r) => sum + toSafeNumber(r.overtime_hours), 0);

  const departmentData = currentWeekRecords.reduce((acc, record) => {
    const dept = record.department || 'unassigned';
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

  const weekNumbers = [...new Set(payrollRecords.map(r => r.week_number))].sort((a, b) => a - b).slice(-8);
  const weeklyTrend = weekNumbers.map(weekNum => {
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
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("StaffDashboard")}>
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
                {weekNumbers.map(weekNum => (
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
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Hours</p>
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{safeNumber(totalHours, 1)}</p>
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
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle>Weekly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => `£${safeNumber(value, 2)}`}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="total" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm">
            <CardHeader>
              <CardTitle>Department Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => `£${safeNumber(value, 2)}`}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <CardTitle>Staff Payroll Breakdown - Week {selectedWeek}</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {currentWeekRecords.map(record => {
                    const totalDeductions = toSafeNumber(record.deductions?.late_penalties) +
                      toSafeNumber(record.deductions?.uniform) +
                      toSafeNumber(record.deductions?.other);

                    return (
                      <tr key={record.id} className="border-b hover:bg-gray-50">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
