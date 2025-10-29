
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMode } from '../SafeModeProvider';

/**
 * 🤖 Auto Action Engine
 * Executes automated actions based on EventAutomationRule
 */
export default function AutoActionEngine() {
  const queryClient = useQueryClient();
  const { safeMode } = useSafeMode();

  useEffect(() => {
    if (safeMode) {
      console.log('[AutoActionEngine] Disabled in Safe Mode');
      return;
    }

    const processAutomationRules = async () => {
      try {
        // Get automation rules
        const rules = await base44.entities.EventAutomationRule.filter({
          is_active: true
        });

        // Get recent unactioned events
        const events = await base44.entities.Event.filter({
          auto_action_triggered: false,
          status: 'unread'
        }, '-created_date', 20);

        for (const event of events) {
          // Find matching rules
          const matchingRules = rules.filter(rule => {
            const typeMatch = rule.trigger_event_type === event.event_type;
            
            // Check additional conditions
            if (rule.trigger_conditions) {
              const severityMatch = !rule.trigger_conditions.severity || 
                                   rule.trigger_conditions.severity === event.severity;
              return typeMatch && severityMatch;
            }
            
            return typeMatch;
          });

          for (const rule of matchingRules) {
            // Check cooldown
            if (rule.cooldown_minutes > 0 && rule.last_triggered_at) {
              const lastTriggered = new Date(rule.last_triggered_at);
              const now = new Date();
              const minutesSince = (now - lastTriggered) / (1000 * 60);
              if (minutesSince < rule.cooldown_minutes) continue;
            }

            // Execute action
            let actionResult = null;

            if (rule.action_type === 'create_task') {
              actionResult = await base44.entities.StaffTask.create({
                task_name: `Auto: ${event.title}`,
                description: event.message,
                category: 'admin',
                assigned_to: rule.target_role || 'manager@aura.com',
                due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                status: 'pending',
              });
            }

            if (rule.action_type === 'send_email') {
              actionResult = await base44.integrations.Core.SendEmail({
                to: rule.action_config?.email || 'manager@aura.com',
                subject: `[AURA Alert] ${event.title}`,
                body: event.message,
              });
            }

            if (rule.action_type === 'create_maintenance_ticket' && event.severity === 'critical') {
              actionResult = await base44.entities.MaintenanceTicket.create({
                title: event.title,
                description: event.message,
                category: 'equipment',
                location: event.metadata?.location || 'Unknown',
                priority: 'urgent',
                status: 'open',
                reported_by: 'EventHub Auto',
              });
            }

            // Update event
            await base44.entities.Event.update(event.id, {
              auto_action_triggered: true,
              auto_action_type: rule.action_type,
              auto_action_result: actionResult,
            });

            // Update rule
            await base44.entities.EventAutomationRule.update(rule.id, {
              times_triggered: (rule.times_triggered || 0) + 1,
              last_triggered_at: new Date().toISOString(),
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['userEvents'] });

      } catch (error) {
        console.error('[AutoAction] Error:', error);
      }
    };

    // Run every minute
    processAutomationRules();
    const interval = setInterval(processAutomationRules, 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient, safeMode]);

  return null;
}
