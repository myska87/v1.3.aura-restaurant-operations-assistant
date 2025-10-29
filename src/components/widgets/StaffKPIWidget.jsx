import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, Award, Target, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfWeek } from 'date-fns';

export default function StaffKPIWidget({ user }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const { data: myKPIs = [] } = useQuery({
    queryKey: ['myKPIReports', user?.email, weekStartStr],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.KPIReport.filter({
        staff_email: user.email,
        period_start: weekStartStr
      }, '-kpi_score', 10);
    },
    enabled: !!user?.email,
  });

  const { data: teamStats = [] } = useQuery({
    queryKey: ['teamKPIs', weekStartStr],
    queryFn: async () => {
      const reports = await base44.entities.KPIReport.filter({
        period_start: weekStartStr
      }, '-kpi_score', 100);
      return reports;
    },
  });

  const avgKPIScore = myKPIs.length > 0
    ? myKPIs.reduce((sum, k) => sum + k.kpi_score, 0) / myKPIs.length
    : 0;

  const exceeding = myKPIs.filter(k => k.status === 'exceeds').length;
  const critical = myKPIs.filter(k => k.status === 'critical').length;

  const myRank = user?.email ? teamStats
    .filter(r => r.metric_name === 'attendance')
    .sort((a, b) => b.kpi_score - a.kpi_score)
    .findIndex(r => r.staff_email === user.email) + 1 : 0;

  return (
    <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            My Performance
          </span>
          <Link to={createPageUrl('KPIDashboard')}>
            <Button variant="ghost" size="sm">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall KPI Score */}
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Overall KPI Score</p>
            <p className="text-4xl font-bold text-purple-600 mb-1">{avgKPIScore.toFixed(1)}</p>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i <= Math.round(avgKPIScore / 20) 
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* KPI Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{exceeding}</p>
              <p className="text-xs text-gray-600">Exceeding</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{critical}</p>
              <p className="text-xs text-gray-600">Critical</p>
            </div>
          </div>

          {/* Team Rank */}
          {myRank > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Team Rank</span>
              </div>
              <span className="text-lg font-bold text-blue-600">#{myRank}</span>
            </div>
          )}

          {/* My KPIs */}
          {myKPIs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">This Week's Metrics</p>
              {myKPIs.slice(0, 3).map(kpi => (
                <div key={kpi.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 capitalize">{kpi.metric_name.replace('_', ' ')}</span>
                  <Badge className={
                    kpi.status === 'exceeds' ? 'bg-green-100 text-green-800' :
                    kpi.status === 'meets' ? 'bg-blue-100 text-blue-800' :
                    kpi.status === 'below' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {kpi.achieved_value.toFixed(0)}/{kpi.target_value}
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