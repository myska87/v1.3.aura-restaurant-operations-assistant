
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';
import { useSafeMode } from '../SafeModeProvider';

/**
 * 🤖 AI Summary Engine for OperationsCore
 * Generates weekly insights on operational performance
 */
export default function AISummaryEngine() {
  const queryClient = useQueryClient();
  const { safeMode } = useSafeMode();

  useEffect(() => {
    if (safeMode) {
      console.log('[AISummary] Disabled in Safe Mode');
      return;
    }

    const generateWeeklySummary = async () => {
      try {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

        // Check if summary already exists for this week
        const existing = await base44.entities.OperationWeeklySummary.filter({
          week_start_date: format(weekStart, 'yyyy-MM-dd')
        });

        if (existing.length > 0) return; // Already generated

        // Fetch all tasks for this week
        const tasks = await base44.entities.OperationTask.filter({
          due_date: {
            $gte: weekStart.toISOString(),
            $lte: weekEnd.toISOString()
          }
        });

        const completed = tasks.filter(t => t.status === 'completed');
        const overdue = tasks.filter(t => t.status === 'overdue');
        const sopTasks = tasks.filter(t => t.type === 'sop');
        const auditTasks = tasks.filter(t => t.type === 'audit' || t.type === 'quality');
        const checklistTasks = tasks.filter(t => t.type === 'checklist');

        // Calculate average score
        const tasksWithScores = tasks.filter(t => t.score > 0);
        const avgScore = tasksWithScores.length > 0
          ? tasksWithScores.reduce((sum, t) => sum + t.score, 0) / tasksWithScores.length
          : 0;

        // Find top performers
        const performanceMap = {};
        completed.forEach(task => {
          const email = task.completed_by_email;
          if (email) {
            if (!performanceMap[email]) {
              performanceMap[email] = {
                staff_email: email,
                staff_name: task.completed_by_name,
                tasks_completed: 0
              };
            }
            performanceMap[email].tasks_completed++;
          }
        });

        const topPerformers = Object.values(performanceMap)
          .sort((a, b) => b.tasks_completed - a.tasks_completed)
          .slice(0, 3);

        // Generate AI summary using LLM
        const summaryPrompt = `
Analyze this week's restaurant operations data and provide insights:

Total Tasks: ${tasks.length}
Completed: ${completed.length}
Overdue: ${overdue.length}
Completion Rate: ${tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0}%

SOPs: ${sopTasks.filter(t => t.status === 'completed').length}/${sopTasks.length} completed
Quality Audits: ${auditTasks.filter(t => t.status === 'completed').length}/${auditTasks.length} completed
Checklists: ${checklistTasks.filter(t => t.status === 'completed').length}/${checklistTasks.length} completed

Average Quality Score: ${avgScore.toFixed(1)}/5

Top Performers: ${topPerformers.map(p => p.staff_name).join(', ')}

Provide a brief, positive summary (2-3 sentences) highlighting what's working well and any areas needing attention.
        `;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
          prompt: summaryPrompt,
        });

        // Identify highlights and areas needing attention
        const highlights = [];
        const needsAttention = [];

        if (completed.length / tasks.length >= 0.9) {
          highlights.push('Excellent completion rate this week');
        }
        if (avgScore >= 4) {
          highlights.push('High quality standards maintained');
        }
        if (overdue.length === 0) {
          highlights.push('Zero overdue tasks - perfect execution');
        }

        if (overdue.length > 3) {
          needsAttention.push(`${overdue.length} tasks overdue - review scheduling`);
        }
        if (avgScore < 3) {
          needsAttention.push('Quality scores below target - additional training needed');
        }

        // Create summary
        await base44.entities.OperationWeeklySummary.create({
          week_start_date: format(weekStart, 'yyyy-MM-dd'),
          week_end_date: format(weekEnd, 'yyyy-MM-dd'),
          total_tasks: tasks.length,
          completed_tasks: completed.length,
          overdue_tasks: overdue.length,
          completion_rate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
          sop_completion: sopTasks.filter(t => t.status === 'completed').length,
          audit_completion: auditTasks.filter(t => t.status === 'completed').length,
          checklist_completion: checklistTasks.filter(t => t.status === 'completed').length,
          avg_score: avgScore,
          ai_summary: aiResponse,
          top_performers: topPerformers,
          highlights,
          areas_needing_attention: needsAttention,
          generated_at: new Date().toISOString(),
          generated_by: 'ai',
        });

        queryClient.invalidateQueries({ queryKey: ['weeklySummary'] });

      } catch (error) {
        console.error('[AISummary] Error:', error);
      }
    };

    // Run once on Monday mornings
    const now = new Date();
    let interval; // Declare interval outside the conditional block

    if (now.getDay() === 1 && now.getHours() === 9) { // Monday 9 AM
      generateWeeklySummary();
    }

    // Also check every 6 hours
    interval = setInterval(() => { // Assign to the declared variable
      const checkTime = new Date();
      if (checkTime.getDay() === 1 && checkTime.getHours() === 9) {
        generateWeeklySummary();
      }
    }, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient, safeMode]); // Add safeMode to dependency array

  return null;
}
