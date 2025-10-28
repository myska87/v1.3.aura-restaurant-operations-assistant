import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Home,
  ArrowLeft,
  Edit,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { motion } from 'framer-motion';

export default function MyAttendance() {
  const queryClient = useQueryClient();
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [adjustmentData, setAdjustmentData] = useState({
    adjustment_type: 'incorrect_time',
    requested_clock_in: '',
    requested_clock_out: '',
    reason: '',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ['myAttendance', user?.email],
    queryFn: () => base44.entities.AttendanceRecord.filter({ staff_email: user?.email }, '-shift_date'),
    enabled: !!user?.email,
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ['myAdjustments', user?.email],
    queryFn: () => base44.entities.AttendanceAdjustment.filter({ staff_email: user?.email }, '-requested_at'),
    enabled: !!user?.email,
  });

  const requestAdjustmentMutation = useMutation({
    mutationFn: (data) => base44.entities.AttendanceAdjustment.create({
      ...data,
      staff_email: user?.email,
      staff_name: user?.full_name,
      requested_at: new Date().toISOString(),
      status: 'pending',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAdjustments'] });
      setShowAdjustmentDialog(false);
      setSelectedRecord(null);
      setAdjustmentData({
        adjustment_type: 'incorrect_time',
        requested_clock_in: '',
        requested_clock_out: '',
        reason: '',
      });
    },
  });

  // Calculate stats
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  
  const thisWeekRecords = attendanceRecords.filter(record => {
    const recordDate = parseISO(record.shift_date);
    return recordDate >= thisWeekStart && recordDate <= thisWeekEnd;
  });

  const totalHoursThisWeek = thisWeekRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0);
  const lateCountThisWeek = thisWeekRecords.filter(r => r.status === 'late').length;
  const overtimeHoursThisWeek = thisWeekRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);

  const handleRequestAdjustment = (record) => {
    setSelectedRecord(record);
    setAdjustmentData({
      ...adjustmentData,
      attendance_record_id: record.id,
      requested_clock_in: record.actual_clock_in || '',
      requested_clock_out: record.actual_clock_out || '',
    });
    setShowAdjustmentDialog(true);
  };

  const handleSubmitAdjustment = () => {
    requestAdjustmentMutation.mutate(adjustmentData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#014D40]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('ClockInOut')}>
            <Button variant="outline" size="sm">
              <Clock className="w-4 h-4 mr-2" />
              Clock In/Out
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 My Attendance
          </h1>
          <p className="text-gray-600">Track your working hours and attendance history</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 mb-1">This Week</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {totalHoursThisWeek.toFixed(1)}h
                  </p>
                </div>
                <Clock className="w-12 h-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 mb-1">Overtime</p>
                  <p className="text-3xl font-bold text-green-900">
                    {overtimeHoursThisWeek.toFixed(1)}h
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700 mb-1">Late Arrivals</p>
                  <p className="text-3xl font-bold text-amber-900">
                    {lateCountThisWeek}
                  </p>
                </div>
                <AlertCircle className="w-12 h-12 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 mb-1">Total Shifts</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {thisWeekRecords.length}
                  </p>
                </div>
                <Calendar className="w-12 h-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Adjustments */}
        {adjustments.filter(a => a.status === 'pending').length > 0 && (
          <Card className="mb-6 border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Pending Adjustment Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {adjustments.filter(a => a.status === 'pending').map(adj => (
                  <div key={adj.id} className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{adj.adjustment_type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-600 mt-1">{adj.reason}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Requested on {format(parseISO(adj.requested_at), 'PPP')}
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Pending Review
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Records */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendanceRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No attendance records yet</p>
                </div>
              ) : (
                attendanceRecords.map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="p-4 bg-gray-50 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-bold text-lg text-gray-900">
                              {format(parseISO(record.shift_date), 'EEEE, MMMM d, yyyy')}
                            </p>
                            <Badge className={
                              record.status === 'verified' ? 'bg-green-100 text-green-800' :
                              record.status === 'late' ? 'bg-red-100 text-red-800' :
                              record.status === 'on_time' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {record.status === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {record.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          <div className="grid md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Scheduled</p>
                              <p className="font-medium">{record.scheduled_start} - {record.scheduled_end}</p>
                            </div>

                            {record.actual_clock_in && (
                              <div>
                                <p className="text-gray-600">Clock In</p>
                                <p className="font-medium">
                                  {format(parseISO(record.actual_clock_in), 'p')}
                                </p>
                                {record.lateness_minutes > 0 && (
                                  <p className="text-xs text-red-600">
                                    {record.lateness_minutes}min late
                                  </p>
                                )}
                              </div>
                            )}

                            {record.actual_clock_out && (
                              <div>
                                <p className="text-gray-600">Clock Out</p>
                                <p className="font-medium">
                                  {format(parseISO(record.actual_clock_out), 'p')}
                                </p>
                              </div>
                            )}

                            {record.total_hours && (
                              <div>
                                <p className="text-gray-600">Hours Worked</p>
                                <p className="font-bold text-[#014D40]">
                                  {record.total_hours.toFixed(2)}h
                                </p>
                                {record.overtime_hours > 0 && (
                                  <p className="text-xs text-green-600">
                                    +{record.overtime_hours.toFixed(1)}h overtime
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {record.notes && (
                            <div className="mt-3 p-2 bg-white rounded text-sm">
                              <p className="text-gray-600">Notes: {record.notes}</p>
                            </div>
                          )}
                        </div>

                        {record.status !== 'verified' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRequestAdjustment(record)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Request Adjustment
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Adjustment Request Dialog */}
        <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Attendance Adjustment</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Adjustment Type</Label>
                <Select
                  value={adjustmentData.adjustment_type}
                  onValueChange={(value) => setAdjustmentData({...adjustmentData, adjustment_type: value})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="missing_clock_in">Missing Clock In</SelectItem>
                    <SelectItem value="missing_clock_out">Missing Clock Out</SelectItem>
                    <SelectItem value="incorrect_time">Incorrect Time</SelectItem>
                    <SelectItem value="technical_issue">Technical Issue</SelectItem>
                    <SelectItem value="forgot_to_clock">Forgot to Clock</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Requested Clock In Time</Label>
                  <Input
                    type="datetime-local"
                    value={adjustmentData.requested_clock_in ? format(parseISO(adjustmentData.requested_clock_in), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => setAdjustmentData({
                      ...adjustmentData,
                      requested_clock_in: e.target.value ? new Date(e.target.value).toISOString() : ''
                    })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Requested Clock Out Time</Label>
                  <Input
                    type="datetime-local"
                    value={adjustmentData.requested_clock_out ? format(parseISO(adjustmentData.requested_clock_out), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => setAdjustmentData({
                      ...adjustmentData,
                      requested_clock_out: e.target.value ? new Date(e.target.value).toISOString() : ''
                    })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Reason for Adjustment</Label>
                <Textarea
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({...adjustmentData, reason: e.target.value})}
                  placeholder="Please explain why you need this adjustment..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Your manager will review this request. 
                  Please provide a clear explanation to help speed up approval.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAdjustmentDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAdjustment}
                disabled={!adjustmentData.reason || requestAdjustmentMutation.isPending}
                className="bg-[#014D40] hover:bg-[#013830]"
              >
                <FileText className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}