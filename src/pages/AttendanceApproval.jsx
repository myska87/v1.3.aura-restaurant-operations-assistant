import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MapPin,
  Calendar,
  User,
  FileText,
  Home,
  ArrowLeft,
  Filter,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

export default function AttendanceApproval() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['attendanceAdjustments', filterStatus],
    queryFn: () => {
      if (filterStatus === 'all') {
        return base44.entities.AttendanceAdjustment.list('-requested_at');
      }
      return base44.entities.AttendanceAdjustment.filter({ status: filterStatus }, '-requested_at');
    },
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendanceRecords'],
    queryFn: () => base44.entities.AttendanceRecord.list('-shift_date'),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }) => {
      const adjustment = adjustments.find(a => a.id === id);
      
      // Update adjustment status
      await base44.entities.AttendanceAdjustment.update(id, {
        status: approved ? 'approved' : 'rejected',
        manager_email: user?.email,
        manager_name: user?.full_name,
        manager_notes: managerNotes,
        reviewed_at: new Date().toISOString(),
      });

      // If approved, update the attendance record
      if (approved && adjustment) {
        const record = attendanceRecords.find(r => r.id === adjustment.attendance_record_id);
        if (record) {
          const updates = {};
          if (adjustment.requested_clock_in) {
            updates.actual_clock_in = adjustment.requested_clock_in;
          }
          if (adjustment.requested_clock_out) {
            updates.actual_clock_out = adjustment.requested_clock_out;
          }
          
          // Recalculate hours if both times exist
          if (updates.actual_clock_in && updates.actual_clock_out) {
            const clockIn = new Date(updates.actual_clock_in);
            const clockOut = new Date(updates.actual_clock_out);
            const hours = (clockOut - clockIn) / (1000 * 60 * 60);
            updates.total_hours = parseFloat(hours.toFixed(2));
          }
          
          updates.verified_by = user?.email;
          updates.verified_at = new Date().toISOString();
          updates.status = 'verified';
          
          await base44.entities.AttendanceRecord.update(adjustment.attendance_record_id, updates);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceAdjustments'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      setShowReviewDialog(false);
      setSelectedAdjustment(null);
      setManagerNotes('');
    },
  });

  const filteredAdjustments = adjustments.filter(adj => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      adj.staff_name?.toLowerCase().includes(searchLower) ||
      adj.staff_email?.toLowerCase().includes(searchLower) ||
      adj.reason?.toLowerCase().includes(searchLower)
    );
  });

  const handleReview = (adjustment) => {
    setSelectedAdjustment(adjustment);
    setShowReviewDialog(true);
  };

  const handleApprove = () => {
    if (selectedAdjustment) {
      approveMutation.mutate({ id: selectedAdjustment.id, approved: true });
    }
  };

  const handleReject = () => {
    if (selectedAdjustment) {
      approveMutation.mutate({ id: selectedAdjustment.id, approved: false });
    }
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
          <Link to={createPageUrl('ManagerDashboard')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Manager Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ✅ Attendance Approval
          </h1>
          <p className="text-gray-600">Review and approve attendance adjustments</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by staff name or reason..."
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 mb-1">Pending Review</p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {adjustments.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <Clock className="w-12 h-12 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 mb-1">Approved</p>
                  <p className="text-3xl font-bold text-green-900">
                    {adjustments.filter(a => a.status === 'approved').length}
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 mb-1">Rejected</p>
                  <p className="text-3xl font-bold text-red-900">
                    {adjustments.filter(a => a.status === 'rejected').length}
                  </p>
                </div>
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adjustments List */}
        <div className="space-y-4">
          {filteredAdjustments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No attendance adjustments found</p>
              </CardContent>
            </Card>
          ) : (
            filteredAdjustments.map((adjustment, index) => (
              <motion.div
                key={adjustment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-none shadow-sm hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {adjustment.staff_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {adjustment.staff_name}
                            </h3>
                            <p className="text-sm text-gray-600">{adjustment.staff_email}</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Adjustment Type</p>
                            <Badge className="bg-purple-100 text-purple-800">
                              {adjustment.adjustment_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          {adjustment.requested_clock_in && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Requested Clock In</p>
                              <p className="font-medium">
                                {format(parseISO(adjustment.requested_clock_in), 'PPP p')}
                              </p>
                            </div>
                          )}

                          {adjustment.requested_clock_out && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Requested Clock Out</p>
                              <p className="font-medium">
                                {format(parseISO(adjustment.requested_clock_out), 'PPP p')}
                              </p>
                            </div>
                          )}

                          <div>
                            <p className="text-sm text-gray-600 mb-1">Requested</p>
                            <p className="font-medium">
                              {format(parseISO(adjustment.requested_at), 'PPP p')}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <p className="text-sm text-gray-600 mb-1">Reason</p>
                          <p className="text-gray-900">{adjustment.reason}</p>
                        </div>

                        {adjustment.status !== 'pending' && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Manager Review</p>
                            <p className="text-sm text-gray-900 mb-2">
                              <strong>By:</strong> {adjustment.manager_name}
                            </p>
                            {adjustment.manager_notes && (
                              <p className="text-sm text-gray-900">
                                <strong>Notes:</strong> {adjustment.manager_notes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col items-end gap-3">
                        <Badge className={
                          adjustment.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                          adjustment.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }>
                          {adjustment.status}
                        </Badge>

                        {adjustment.status === 'pending' && (
                          <Button
                            onClick={() => handleReview(adjustment)}
                            className="bg-[#014D40] hover:bg-[#013830]"
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Attendance Adjustment</DialogTitle>
            </DialogHeader>

            {selectedAdjustment && (
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm font-semibold">Staff Member</Label>
                  <p className="text-lg font-medium mt-1">{selectedAdjustment.staff_name}</p>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Adjustment Type</Label>
                  <p className="mt-1">{selectedAdjustment.adjustment_type.replace(/_/g, ' ')}</p>
                </div>

                {selectedAdjustment.requested_clock_in && (
                  <div>
                    <Label className="text-sm font-semibold">Requested Clock In</Label>
                    <p className="mt-1">
                      {format(parseISO(selectedAdjustment.requested_clock_in), 'PPP p')}
                    </p>
                  </div>
                )}

                {selectedAdjustment.requested_clock_out && (
                  <div>
                    <Label className="text-sm font-semibold">Requested Clock Out</Label>
                    <p className="mt-1">
                      {format(parseISO(selectedAdjustment.requested_clock_out), 'PPP p')}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-semibold">Reason</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded">{selectedAdjustment.reason}</p>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Manager Notes</Label>
                  <Textarea
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    placeholder="Add your review notes..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReviewDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={approveMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}