import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * AURA Brain - Hygiene Agent
 * Monitors hygiene records, checklists, and form completion
 * Takes automated actions to maintain hygiene standards
 */
export default function HygieneAgent() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const runAgent = async () => {
      try {
        // Check if agent is enabled
        const configs = await base44.entities.AgentConfig.filter({ agent_name: 'hygiene_agent' });
        const config = configs[0];
        
        if (!config || !config.is_enabled) {
          console.log('[HygieneAgent] Agent is disabled');
          return;
        }

        // 1️⃣ Check for overdue hygiene forms
        const today = new Date();
        const assignments = await base44.entities.FormAssignmentMetadata.filter({
          completion_status: 'pending',
          due_date: { $lt: today.toISOString() }
        });

        const hygieneAssignments = assignments.filter(a => 
          a.form_name?.toLowerCase().includes('hygiene') ||
          a.form_name?.toLowerCase().includes('temperature') ||
          a.form_name?.toLowerCase().includes('cleaning')
        );

        // Create reminders for overdue hygiene forms
        for (const assignment of hygieneAssignments.slice(0, 5)) {
          await base44.entities.AgentLog.create({
            agent_name: 'hygiene_agent',
            action_type: 'reminder_sent',
            action_description: `Overdue hygiene form: ${assignment.form_name}`,
            trigger_event: 'form_overdue',
            related_entity: 'FormAssignmentMetadata',
            related_entity_id: assignment.id,
            related_entity_name: assignment.form_name,
            decision_reasoning: 'Form is past due date and not completed',
            confidence_score: 1.0,
            severity: 'high',
            status: 'completed',
            notification_sent: true,
            notification_recipients: [assignment.assigned_to_email],
            success: true,
          });

          // Create event for EventHub
          await base44.entities.Event.create({
            source_module: 'ai',
            event_type: 'form_overdue',
            title: '🧹 Hygiene Form Overdue',
            message: `${assignment.assigned_to_name}, your hygiene form "${assignment.form_name}" is overdue. Please complete it ASAP.`,
            severity: 'warning',
            recipient_emails: [assignment.assigned_to_email],
            recipient_roles: ['manager'],
            linked_entity_type: 'FormAssignmentMetadata',
            linked_entity_id: assignment.id,
            linked_entity_name: assignment.form_name,
            action_url: '/form-intelligence',
          });
        }

        // 2️⃣ Check for low hygiene scores
        const scores = await base44.entities.HygieneUserScore.list();
        const lowScorers = scores.filter(s => (s.compliance_rate || 100) < 80);

        for (const score of lowScorers.slice(0, 3)) {
          await base44.entities.AgentLog.create({
            agent_name: 'hygiene_agent',
            action_type: 'alert_triggered',
            action_description: `Low hygiene compliance: ${score.staff_name} at ${score.compliance_rate}%`,
            trigger_event: 'low_compliance_rate',
            related_entity: 'HygieneUserScore',
            related_entity_id: score.id,
            related_entity_name: score.staff_name,
            decision_reasoning: 'Compliance rate below 80% threshold',
            confidence_score: 0.9,
            severity: 'medium',
            status: 'completed',
            notification_sent: true,
            notification_recipients: ['manager@restaurant.com'],
            success: true,
          });
        }

        // 3️⃣ Check for critical hygiene alerts
        const alerts = await base44.entities.HygieneAlertLog.filter({ 
          status: 'open',
          severity: { $in: ['critical', 'urgent'] }
        });

        for (const alert of alerts.slice(0, 5)) {
          // Create corrective task
          const task = await base44.entities.OperationTask.create({
            title: `URGENT: Resolve ${alert.item_name} Hygiene Alert`,
            type: 'general',
            frequency: 'one_time',
            department: 'kitchen',
            assigned_to: alert.triggered_by_email,
            assigned_to_name: alert.triggered_by_name,
            status: 'pending',
            due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
            priority: 'critical',
            auto_generated: true,
            comments: `Critical hygiene alert requires immediate attention. Alert type: ${alert.alert_type}`,
          });

          await base44.entities.AgentLog.create({
            agent_name: 'hygiene_agent',
            action_type: 'task_created',
            action_description: `Created urgent task for critical hygiene alert: ${alert.item_name}`,
            trigger_event: 'critical_hygiene_alert',
            related_entity: 'HygieneAlertLog',
            related_entity_id: alert.id,
            related_entity_name: alert.item_name,
            created_task_id: task.id,
            decision_reasoning: 'Critical hygiene alert requires immediate corrective action',
            confidence_score: 1.0,
            severity: 'critical',
            status: 'completed',
            notification_sent: true,
            success: true,
          });
        }

        console.log(`[HygieneAgent] Completed run - processed ${hygieneAssignments.length} overdue forms, ${lowScorers.length} low scores, ${alerts.length} critical alerts`);

      } catch (error) {
        console.error('[HygieneAgent] Error:', error);
        
        // Log the error
        try {
          await base44.entities.AgentLog.create({
            agent_name: 'hygiene_agent',
            action_type: 'analysis',
            action_description: 'Agent run failed',
            trigger_event: 'scheduled_run',
            status: 'failed',
            success: false,
            error_message: error.message,
          });
        } catch (logError) {
          console.error('[HygieneAgent] Failed to log error:', logError);
        }
      }
    };

    // Run immediately on mount
    runAgent();

    // Run every 30 minutes
    const interval = setInterval(runAgent, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return null; // Invisible background service
}