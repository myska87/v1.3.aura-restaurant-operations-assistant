import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Droplets, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HygieneSummaryWidget({ user }) {
  const today = new Date().toISOString().split('T')[0];

  const { data: myScore } = useQuery({
    queryKey: ['myHygieneScore', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const scores = await base44.entities.HygieneUserScore.filter({
        staff_email: user.email
      });
      return scores[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['hygieneAlerts'],
    queryFn: async () => {
      const allAlerts = await base44.entities.HygieneAlertLog.filter({
        status: { $in: ['open', 'acknowledged'] }
      }, '-created_date', 10);
      return allAlerts;
    },
  });

  const { data: todayRecords = [] } = useQuery({
    queryKey: ['todayHygieneRecords', today],
    queryFn: async () => {
      const records = await base44.entities.HygieneRecord.list('-created_date', 100);
      return records.filter(r => {
        const recordDate = new Date(r.created_date).toISOString().split('T')[0];
        return recordDate === today;
      });
    },
  });

  const complianceRate = myScore?.compliance_rate || 0;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'urgent').length;

  return (
    <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            Hygiene Status
          </span>
          <Link to={createPageUrl('HygieneDashboard')}>
            <Button variant="ghost" size="sm">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Compliance Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Compliance Rate</span>
              <span className="text-2xl font-bold text-gray-900">{complianceRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${complianceRate}%` }}
              />
            </div>
          </div>

          {/* Today's Records */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Records Today</span>
            </div>
            <span className="text-lg font-bold text-blue-600">{todayRecords.length}</span>
          </div>

          {/* Critical Alerts */}
          {criticalAlerts > 0 ? (
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">Critical Alerts</span>
              </div>
              <span className="text-lg font-bold text-red-600">{criticalAlerts}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">All Clear</span>
              </div>
              <span className="text-sm text-green-600">✓</span>
            </div>
          )}

          {/* Current Streak */}
          {myScore && myScore.current_streak > 0 && (
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Streak</span>
              </div>
              <span className="text-lg font-bold text-orange-600">🔥 {myScore.current_streak} days</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}