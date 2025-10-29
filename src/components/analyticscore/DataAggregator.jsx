import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { startOfDay, format } from 'date-fns';
import { toSafeNumber } from '@/utils/safeNumber';

/**
 * 📊 Analytics Data Aggregator
 * Collects data from all modules and creates daily snapshots
 */
export default function DataAggregator() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const aggregateDailyData = async () => {
      try {
        const today = startOfDay(new Date());
        const dateStr = format(today, 'yyyy-MM-dd');

        // Check if today's snapshot already exists
        const existing = await base44.entities.AnalyticsSnapshot.filter({
          snapshot_date: dateStr,
          department: 'all'
        });

        if (existing.length > 0) return;

        // 1. Get task completion data
        const allTasks = await base44.entities.OperationTask.list('', 200);
        const todayTasks = allTasks.filter(t => t.due_date?.startsWith(dateStr));
        const completedTasks = todayTasks.filter(t => t.status === 'completed');
        const taskCompletionRate = todayTasks.length > 0
          ? Math.round((completedTasks.length / todayTasks.length) * 100)
          : 0;

        // 2. Get quality scores - WITH SAFE NUMBERS
        const qualityRecords = await base44.entities.QualityRecord.list('-created_date', 100);
        const todayQuality = qualityRecords.filter(r => r.created_date?.startsWith(dateStr));
        const qualityScoreAvg = todayQuality.length > 0
          ? todayQuality.reduce((sum, r) => sum + toSafeNumber(r.score), 0) / todayQuality.length
          : 0;

        // 3. Get attendance data
        const attendance = await base44.entities.AttendanceRecord.list('-shift_date', 100);
        const todayAttendance = attendance.filter(a => a.shift_date === dateStr);
        const onTimeAttendance = todayAttendance.filter(a => a.status === 'on_time');
        const shiftCompliance = todayAttendance.length > 0
          ? Math.round((onTimeAttendance.length / todayAttendance.length) * 100)
          : 0;

        // 4. Get inventory data - WITH SAFE NUMBERS
        const ingredients = await base44.entities.Ingredient.list();
        const totalValue = ingredients.reduce((sum, i) => 
          sum + (toSafeNumber(i.current_stock) * toSafeNumber(i.unit_cost)), 0
        );
        const lowStockItems = ingredients.filter(i => 
          toSafeNumber(i.current_stock) <= toSafeNumber(i.reorder_point)
        );
        const inventoryCostVariance = ingredients.length > 0
          ? Math.round((lowStockItems.length / ingredients.length) * 100)
          : 0;

        // 5. Get active alerts
        const events = await base44.entities.Event.filter({
          status: 'unread',
          severity: { $in: ['warning', 'critical'] }
        });

        // 6. Get SOP completion
        const sopSignatures = await base44.entities.SOPSignatureLog.list('-signed_at', 100);
        const todaySignatures = sopSignatures.filter(s => s.signed_at?.startsWith(dateStr));

        // 7. Get checklist completion
        const checklists = await base44.entities.ChecklistExecution.list('-execution_date', 100);
        const todayChecklists = checklists.filter(c => c.execution_date === dateStr);
        const completedChecklists = todayChecklists.filter(c => c.status === 'completed');
        const checklistCompletionRate = todayChecklists.length > 0
          ? Math.round((completedChecklists.length / todayChecklists.length) * 100)
          : 0;

        // 8. Get staff data
        const staff = await base44.entities.User.filter({ status: 'active' });

        // Create snapshot - ALL VALUES SAFELY CONVERTED
        await base44.entities.AnalyticsSnapshot.create({
          snapshot_date: dateStr,
          period_type: 'daily',
          department: 'all',
          task_completion_rate: toSafeNumber(taskCompletionRate, 0),
          quality_score_avg: toSafeNumber(qualityScoreAvg, 0),
          shift_compliance: toSafeNumber(shiftCompliance, 0),
          inventory_cost_variance: toSafeNumber(inventoryCostVariance, 0),
          active_alerts: toSafeNumber(events.length, 0),
          sop_completion_rate: toSafeNumber(todaySignatures.length, 0),
          checklist_completion_rate: toSafeNumber(checklistCompletionRate, 0),
          attendance_rate: toSafeNumber(shiftCompliance, 0),
          total_hours_worked: todayAttendance.reduce((sum, a) => sum + toSafeNumber(a.total_hours), 0),
          overtime_hours: todayAttendance.reduce((sum, a) => sum + toSafeNumber(a.overtime_hours), 0),
          total_staff: toSafeNumber(staff.length, 0),
          stock_efficiency: Math.max(0, 100 - toSafeNumber(inventoryCostVariance)),
          generated_at: new Date().toISOString(),
          generated_by: 'system',
        });

        queryClient.invalidateQueries({ queryKey: ['analyticsSnapshots'] });

      } catch (error) {
        console.error('[DataAggregator] Error aggregating daily data:', error);
      }
    };

    // Run daily at midnight and on mount
    aggregateDailyData();
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 10) {
        aggregateDailyData();
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}