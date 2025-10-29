import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { useSafeMode } from '../SafeModeProvider';
import { safeNumber, safePercent, safeAverage } from '@/utils/safeNumber';

/**
 * 📊 Data Aggregator
 * Creates daily snapshots of operational metrics
 */
export default function DataAggregator() {
  const queryClient = useQueryClient();
  const { safeMode } = useSafeMode();

  useEffect(() => {
    if (safeMode) {
      console.log('[DataAggregator] Disabled in Safe Mode');
      return;
    }

    const aggregateData = async () => {
      try {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        // Check if snapshot already created today
        const existing = await base44.entities.AnalyticsSnapshot.filter({
          snapshot_date: todayStr,
          period_type: 'daily'
        });

        if (existing.length > 0) return;

        // Fetch data for aggregation
        const [tasks, quality, attendance, forms] = await Promise.all([
          base44.entities.OperationTask.list('-created_date', 100),
          base44.entities.QualityRecord.list('-created_date', 50),
          base44.entities.AttendanceRecord.list('-shift_date', 100),
          base44.entities.FormResponse.list('-submitted_at', 100),
        ]);

        // Calculate metrics with safe number handling
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const taskCompletionRate = safePercent(completedTasks, tasks.length, 1);

        const qualityScores = quality.map(q => safeNumber(q.score));
        const qualityAvg = safeAverage(qualityScores, null, 2);

        const attendedShifts = attendance.filter(a => a.status === 'on_time' || a.status === 'late').length;
        const shiftCompliance = safePercent(attendedShifts, attendance.length, 1);

        const totalHours = attendance.reduce((sum, a) => sum + safeNumber(a.total_hours), 0);
        const overtimeHours = attendance.reduce((sum, a) => sum + safeNumber(a.overtime_hours), 0);

        const completedForms = forms.filter(f => f.status === 'submitted' || f.status === 'approved').length;
        const formCompletionRate = safePercent(completedForms, forms.length, 1);

        // Create snapshot
        await base44.entities.AnalyticsSnapshot.create({
          snapshot_date: todayStr,
          period_type: 'daily',
          department: 'all',
          task_completion_rate: taskCompletionRate,
          quality_score_avg: qualityAvg,
          shift_compliance: shiftCompliance,
          sop_completion_rate: 0, // Placeholder
          checklist_completion_rate: formCompletionRate,
          attendance_rate: shiftCompliance,
          total_hours_worked: safeNumber(totalHours),
          overtime_hours: safeNumber(overtimeHours),
          total_staff: new Set(attendance.map(a => a.staff_email)).size,
          generated_at: new Date().toISOString(),
          generated_by: 'system',
        });

        queryClient.invalidateQueries({ queryKey: ['analyticsSnapshot'] });
        console.log(`[DataAggregator] ✅ Created snapshot for ${todayStr}`);

      } catch (error) {
        console.error('[DataAggregator] Error:', error);
      }
    };

    // Run daily at midnight
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 30) {
        aggregateData();
      }
    }, 30 * 60 * 1000);

    // Run once on mount if needed
    aggregateData();

    return () => clearInterval(interval);
  }, [queryClient, safeMode]);

  return null;
}