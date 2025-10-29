import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';

export default function SOPAlertsWidget({ user }) {
  const { data: myCertifications = [] } = useQuery({
    queryKey: ['myCertifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.SOPCertification.filter({
        staff_email: user.email,
        status: { $in: ['pending', 'in_progress', 'overdue'] }
      }, '-assigned_date', 10);
    },
    enabled: !!user?.email,
  });

  const { data: completedThisWeek = [] } = useQuery({
    queryKey: ['completedSOPsWeek', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoStr = weekAgo.toISOString();

      return await base44.entities.SOPCertification.filter({
        staff_email: user.email,
        status: 'completed',
        completed_date: { $gte: weekAgoStr }
      });
    },
    enabled: !!user?.email,
  });

  const overdue = myCertifications.filter(c => c.status === 'overdue').length;
  const inProgress = myCertifications.filter(c => c.status === 'in_progress').length;

  return (
    <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            SOP Status
          </span>
          <Link to={createPageUrl('SOPDashboardHub')}>
            <Button variant="ghost" size="sm">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Completed This Week */}
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Completed This Week</span>
            </div>
            <span className="text-lg font-bold text-green-600">{completedThisWeek.length}</span>
          </div>

          {/* In Progress */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">In Progress</span>
            </div>
            <span className="text-lg font-bold text-blue-600">{inProgress}</span>
          </div>

          {/* Overdue */}
          {overdue > 0 ? (
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">Overdue</span>
              </div>
              <span className="text-lg font-bold text-red-600">{overdue}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">All Up to Date</span>
              </div>
              <span className="text-sm text-green-600">✓</span>
            </div>
          )}

          {/* Pending SOPs List */}
          {myCertifications.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">Pending SOPs</p>
              {myCertifications.slice(0, 3).map(cert => (
                <div key={cert.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate flex-1">{cert.sop_title}</span>
                  <Badge className={
                    cert.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {cert.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}