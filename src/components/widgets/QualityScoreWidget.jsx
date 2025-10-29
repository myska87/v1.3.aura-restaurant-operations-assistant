import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, TrendingUp, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfWeek } from 'date-fns';

export default function QualityScoreWidget({ user }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['myQualityRecords', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const records = await base44.entities.QualityRecord.filter({
        checked_by_email: user.email
      }, '-created_date', 50);
      return records;
    },
    enabled: !!user?.email,
  });

  const { data: qualityScores = [] } = useQuery({
    queryKey: ['qualityScores', weekStartStr],
    queryFn: async () => {
      return await base44.entities.QualityScore.filter({
        period_start: weekStartStr
      }, '-average_score', 10);
    },
  });

  const thisWeekRecords = qualityRecords.filter(r => {
    const recordDate = new Date(r.created_date);
    return recordDate >= weekStart;
  });

  const avgScore = thisWeekRecords.length > 0
    ? thisWeekRecords.reduce((sum, r) => sum + r.score, 0) / thisWeekRecords.length
    : 0;

  const lowScores = thisWeekRecords.filter(r => r.score < 3).length;
  const excellentScores = thisWeekRecords.filter(r => r.score === 5).length;

  const overallAvg = qualityScores.length > 0
    ? qualityScores.reduce((sum, s) => sum + s.average_score, 0) / qualityScores.length
    : 0;

  return (
    <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-600" />
            Quality Score
          </span>
          <Link to={createPageUrl('QualityDashboard')}>
            <Button variant="ghost" size="sm">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* My Average */}
          <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">My Average This Week</p>
            <div className="flex items-center justify-center gap-2 mb-1">
              <p className="text-4xl font-bold text-amber-600">{avgScore.toFixed(1)}</p>
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-xs text-gray-600">{thisWeekRecords.length} checks completed</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{excellentScores}</p>
              <p className="text-xs text-gray-600">Excellent (5★)</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{lowScores}</p>
              <p className="text-xs text-gray-600">Needs Work (&lt;3)</p>
            </div>
          </div>

          {/* Team Average */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Team Average</span>
            </div>
            <span className="text-lg font-bold text-blue-600">{overallAvg.toFixed(1)}★</span>
          </div>

          {/* Quick Action */}
          <Link to={createPageUrl('QuickQualityCheck')}>
            <Button className="w-full bg-amber-600 hover:bg-amber-700" size="sm">
              <Star className="w-4 h-4 mr-2" />
              Quick Quality Check
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}