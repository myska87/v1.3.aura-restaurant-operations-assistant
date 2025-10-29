import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Star,
  TrendingUp,
  Award,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function PerformanceLeaderboard() {
  const { data: staff = [] } = useQuery({
    queryKey: ['staffPerformance'],
    queryFn: async () => {
      const allStaff = await base44.entities.User.filter({ status: 'active' });
      
      // Get performance data for each staff
      const staffWithScores = await Promise.all(
        allStaff.map(async (member) => {
          // Get tasks
          const tasks = await base44.entities.OperationTask.filter({
            assigned_to: member.email
          }, '', 100);
          const completedTasks = tasks.filter(t => t.status === 'completed');

          // Get quality checks
          const qualityChecks = await base44.entities.QualityRecord.filter({
            checked_by_email: member.email
          }, '', 50);
          const avgQuality = qualityChecks.length > 0
            ? qualityChecks.reduce((sum, q) => sum + q.score, 0) / qualityChecks.length
            : 0;

          // Get attendance
          const attendance = await base44.entities.AttendanceRecord.filter({
            staff_email: member.email
          }, '', 30);
          const onTime = attendance.filter(a => a.status === 'on_time');
          const punctuality = attendance.length > 0
            ? Math.round((onTime.length / attendance.length) * 100)
            : 0;

          // Calculate overall score
          const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
          const overallScore = (completionRate * 0.4) + (avgQuality * 20 * 0.3) + (punctuality * 0.3);

          return {
            ...member,
            completionRate,
            avgQuality,
            punctuality,
            overallScore,
            tasksCompleted: completedTasks.length,
            totalTasks: tasks.length,
          };
        })
      );

      return staffWithScores
        .filter(s => s.totalTasks > 0) // Only staff with tasks
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, 10);
    },
  });

  const getMedalIcon = (index) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Award className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <Star className="w-5 h-5 text-blue-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Performance Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {staff.map((member, index) => (
            <motion.div
              key={member.email}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className={`flex items-center gap-3 p-4 rounded-lg ${
                index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300' :
                index === 1 ? 'bg-gray-50 border-2 border-gray-300' :
                index === 2 ? 'bg-amber-50 border-2 border-amber-300' :
                'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center justify-center w-10 h-10">
                  {getMedalIcon(index)}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{member.full_name}</h4>
                  <p className="text-xs text-gray-600 capitalize">{member.position || 'Staff'}</p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{member.overallScore.toFixed(0)}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {member.completionRate.toFixed(0)}% tasks
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {member.avgQuality.toFixed(1)}★ quality
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {staff.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Performance data will appear here</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}