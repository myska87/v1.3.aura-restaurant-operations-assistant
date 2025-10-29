
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Download,
  Home,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl, safeNumber, safeCurrency } from '@/utils';
import { format, startOfWeek, endOfWeek, getISOWeek } from 'date-fns';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function PayrollDashboard() {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  const { data: payrollRecords = [], isLoading } = useQuery({
    queryKey: ['payrollRecords', selectedWeek],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(selectedWeek), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      return await base44.entities.PayrollRecord.filter({
        period_start: { $gte: format(weekStart, 'yyyy-MM-dd') },
        period_end: { $lte: format(weekEnd, 'yyyy-MM-dd') }
      });
    },
  });

  const approvePayrollMutation = useMutation({
    mutationFn: (recordId) => 
      base44.entities.PayrollRecord.update(recordId, {
        status: 'approved',
        approved_by: user.email,
        approved_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRecords'] });
      alert('✅ Payroll record approved!');
    },
  });

  const stats = {
    totalStaff: payrollRecords.length,
    totalHours: payrollRecords.reduce((sum, r) => sum + safeNumber(r.total_hours), 0),
    totalPay: payrollRecords.reduce((sum, r) => sum + safeNumber(r.total_net_pay), 0),
    pendingApproval: payrollRecords.filter(r => r.status === 'generated' || r.status === 'verified').length,
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
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
              <CreditCard className="w-4 h-4 mr-2" />
              Staff Wages
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
              <p className="text-gray-600">Manage staff wages and approve payroll</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats.totalStaff}</p>
              <p className="text-sm text-gray-600">Staff Members</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{safeNumber(stats.totalHours, 1).toFixed(1)}</p>
              <p className="text-sm text-gray-600">Total Hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-900">{safeCurrency(stats.totalPay)}</p>
              <p className="text-sm text-gray-600">Total Pay</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-amber-900">{stats.pendingApproval}</p>
              <p className="text-sm text-gray-600">Pending Approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Records */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payroll Records</CardTitle>
              <div className="flex gap-3">
                <Input
                  type="week"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="w-48"
                />
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner message="Loading payroll..." />
            ) : payrollRecords.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No payroll records for this week</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payrollRecords.map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className="border-2">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 mb-2">{record.staff_name}</h3>
                            <div className="grid md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Total Hours</p>
                                <p className="font-semibold text-gray-900">
                                  {safeNumber(record.total_hours, 1).toFixed(1)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Overtime</p>
                                <p className="font-semibold text-gray-900">
                                  {safeNumber(record.overtime_hours, 1).toFixed(1)}h
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Gross Pay</p>
                                <p className="font-semibold text-green-700">
                                  {safeCurrency(record.total_gross_pay)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Net Pay</p>
                                <p className="font-semibold text-green-900">
                                  {safeCurrency(record.total_net_pay)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 items-center">
                            <Badge className={
                              record.status === 'approved' ? 'bg-green-100 text-green-800' :
                              record.status === 'verified' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {record.status}
                            </Badge>
                            {record.status !== 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => approvePayrollMutation.mutate(record.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
