import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Download,
  FileText,
  Home,
  ArrowLeft,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';
import { motion } from 'framer-motion';

export default function PayrollDashboard() {
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week, 1 = last week, etc.

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.position === 'manager' || user?.position === 'owner' || user?.role === 'admin';

  const weekStart = startOfWeek(subWeeks(new Date(), selectedWeek), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const { data: payrollRecords = [], isLoading } = useQuery({
    queryKey: ['payrollRecords', selectedWeek],
    queryFn: async () => {
      const records = await base44.entities.PayrollRecord.list('-created_date', 100);
      return records.filter(r => {
        const periodStart = new Date(r.period_start);
        return periodStart >= weekStart && periodStart <= weekEnd;
      });
    },
    enabled: isManager,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['allStaff'],
    queryFn: () => base44.entities.User.filter({ status: 'active' }),
    enabled: isManager,
  });

  // Calculate totals
  const stats = {
    totalStaff: allStaff.length,
    totalHours: payrollRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0),
    totalCost: payrollRecords.reduce((sum, r) => sum + (r.total_net_pay || 0), 0),
    avgPerformance: payrollRecords.length > 0
      ? Math.round(payrollRecords.reduce((sum, r) => sum + (r.performance_score || 0), 0) / payrollRecords.length)
      : 0,
    recordsGenerated: payrollRecords.length,
    recordsVerified: payrollRecords.filter(r => r.status === 'verified' || r.status === 'approved').length,
    recordsPending: payrollRecords.filter(r => r.status === 'draft' || r.status === 'generated').length,
  };

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">
                Payroll Dashboard is only accessible to Managers and Owners.
              </p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('ManagerDashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Manager Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Payroll Dashboard</h1>
              <p className="text-gray-600">Comprehensive payroll overview and management</p>
            </div>
          </div>
        </div>

        {/* Week Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Payroll Period</p>
                <p className="text-lg font-bold text-gray-900">
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedWeek === 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedWeek(0)}
                >
                  This Week
                </Button>
                <Button
                  variant={selectedWeek === 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedWeek(1)}
                >
                  Last Week
                </Button>
                <Button
                  variant={selectedWeek > 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedWeek(selectedWeek + 1)}
                >
                  Older ←
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Payroll</p>
                    <p className="text-2xl font-bold text-gray-900">
                      £{stats.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalHours.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="w-6 h-6 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Staff</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalStaff}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Performance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.avgPerformance}/100
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link to={createPageUrl('WeeklyPayrollReport')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <FileText className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">Weekly Report</h3>
                <p className="text-sm text-gray-600">Generate detailed payroll report</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('StaffWagesReport')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <CreditCard className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">Staff Wages</h3>
                <p className="text-sm text-gray-600">View individual wage breakdowns</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('AttendanceApproval')}>
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-gray-900 mb-2">Approve Attendance</h3>
                <p className="text-sm text-gray-600">Review and verify timesheets</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Payroll Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Payroll Records ({stats.recordsGenerated})</span>
              <div className="flex gap-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {stats.recordsVerified} Verified
                </Badge>
                <Badge className="bg-amber-100 text-amber-800">
                  {stats.recordsPending} Pending
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payroll data...</p>
              </div>
            ) : payrollRecords.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No payroll records for this period</p>
                <p className="text-sm text-gray-500">
                  Payroll records are auto-generated each week
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {payrollRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{record.staff_name}</p>
                      <p className="text-sm text-gray-600">
                        {record.role} • {record.total_hours?.toFixed(1)}h worked
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        £{record.total_net_pay?.toFixed(2)}
                      </p>
                      <Badge className={
                        record.status === 'approved' ? 'bg-green-100 text-green-800' :
                        record.status === 'verified' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {record.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}