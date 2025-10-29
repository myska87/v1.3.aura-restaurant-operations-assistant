import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { subDays, format } from 'date-fns';

/**
 * 🤖 AI Insights Engine
 * Generates daily insights from analytics data
 */
export default function AIInsightsEngine() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const generateInsights = async () => {
      try {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        // Check if insights already generated for today
        const existing = await base44.entities.AnalyticsInsight.filter({
          insight_date: todayStr
        });

        if (existing.length >= 3) return; // Already generated

        // Get recent snapshots for comparison
        const snapshots = await base44.entities.AnalyticsSnapshot.list('-snapshot_date', 14);
        const latest = snapshots[0];
        const weekAgo = snapshots[7];

        if (!latest || !weekAgo) return;

        const insights = [];

        // 1. Quality Score Insight
        const qualityChange = latest.quality_score_avg - weekAgo.quality_score_avg;
        if (Math.abs(qualityChange) > 0.3) {
          insights.push({
            insight_date: todayStr,
            insight_type: qualityChange > 0 ? 'improvement' : 'warning',
            category: 'quality',
            title: qualityChange > 0 ? '⭐ Quality Scores Improving' : '⚠️ Quality Scores Declining',
            message: `Quality scores ${qualityChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(qualityChange).toFixed(1)} points this week (from ${weekAgo.quality_score_avg.toFixed(1)} to ${latest.quality_score_avg.toFixed(1)}).`,
            severity: qualityChange > 0 ? 'positive' : 'warning',
            metric_name: 'quality_score_avg',
            current_value: latest.quality_score_avg,
            previous_value: weekAgo.quality_score_avg,
            change_percentage: ((qualityChange / weekAgo.quality_score_avg) * 100),
            recommended_actions: qualityChange > 0 
              ? ['Continue current training practices', 'Share best practices across teams']
              : ['Review recent quality checks', 'Schedule refresher training', 'Check if new staff need support'],
            priority: Math.abs(qualityChange) > 0.5 ? 8 : 5,
            auto_generated: true,
          });
        }

        // 2. Task Completion Insight
        const taskChange = latest.task_completion_rate - weekAgo.task_completion_rate;
        if (latest.task_completion_rate < 85) {
          insights.push({
            insight_date: todayStr,
            insight_type: 'warning',
            category: 'operations',
            title: '📋 Task Completion Below Target',
            message: `Only ${latest.task_completion_rate}% of tasks completed this period. Target is 90%+.`,
            severity: 'warning',
            metric_name: 'task_completion_rate',
            current_value: latest.task_completion_rate,
            previous_value: weekAgo.task_completion_rate,
            change_percentage: taskChange,
            recommended_actions: [
              'Review overdue tasks with team',
              'Check if workload is realistic',
              'Provide additional support if needed'
            ],
            priority: latest.task_completion_rate < 75 ? 9 : 6,
            auto_generated: true,
          });
        }

        // 3. Attendance Excellence
        if (latest.shift_compliance >= 95) {
          insights.push({
            insight_date: todayStr,
            insight_type: 'achievement',
            category: 'staff',
            title: '🎉 Excellent Attendance Record',
            message: `${latest.shift_compliance}% attendance compliance this week! Team is punctual and reliable.`,
            severity: 'positive',
            metric_name: 'shift_compliance',
            current_value: latest.shift_compliance,
            previous_value: weekAgo.shift_compliance,
            change_percentage: latest.shift_compliance - weekAgo.shift_compliance,
            recommended_actions: [
              'Recognize team for excellent attendance',
              'Share feedback during team meeting'
            ],
            priority: 7,
            auto_generated: true,
          });
        }

        // Save insights
        for (const insight of insights) {
          await base44.entities.AnalyticsInsight.create(insight);

          // Post critical insights to EventHub
          if (insight.severity === 'warning' || insight.priority >= 8) {
            await base44.entities.Event.create({
              source_module: 'ai',
              event_type: 'ai_insight',
              title: insight.title,
              message: insight.message,
              severity: insight.severity === 'warning' ? 'warning' : 'info',
              recipient_roles: ['manager', 'owner'],
              status: 'unread',
              linked_entity_type: 'AnalyticsInsight',
              linked_entity_id: insight.id,
              action_url: createPageUrl('AnalyticsDashboard'),
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['analyticsInsights'] });

      } catch (error) {
        console.error('[AIInsights] Error:', error);
      }
    };

    // Run daily at 8 AM
    const now = new Date();
    if (now.getHours() === 8 && now.getMinutes() < 30) {
      generateInsights();
    }

    // Check every hour
    const interval = setInterval(() => {
      const checkTime = new Date();
      if (checkTime.getHours() === 8) {
        generateInsights();
      }
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}