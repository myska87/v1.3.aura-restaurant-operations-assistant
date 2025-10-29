
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMode } from '../SafeModeProvider';

/**
 * 🔔 Event Processor
 * Converts ActivityLog into Event notifications
 */
export default function EventProcessor() {
  const queryClient = useQueryClient();
  const { safeMode } = useSafeMode();

  useEffect(() => {
    if (safeMode) {
      console.log('[EventProcessor] Disabled in Safe Mode');
      return;
    }

    const processActivities = async () => {
      try {
        // Get recent activities not yet processed into events
        const activities = await base44.entities.ActivityLog.list('-created_date', 30);
        
        for (const activity of activities) {
          // Check if event already exists for this activity
          const existingEvents = await base44.entities.Event.filter({
            linked_entity_id: activity.id,
            linked_entity_type: 'ActivityLog'
          });

          if (existingEvents.length > 0) continue; // Already processed

          // Determine recipients and severity
          let recipients = [];
          let roles = [];
          let severity = 'info';
          let actionUrl = null;

          // Map activity types to events
          if (activity.activity_type === 'sop_signed') {
            recipients = ['manager@aura.com']; // Notify managers
            roles = ['manager', 'owner'];
            severity = 'success';
            actionUrl = `/sop-viewer?id=${activity.related_entity_id}`;
          }
          
          if (activity.activity_type === 'quality_check' && activity.is_important) {
            recipients = ['manager@aura.com'];
            roles = ['manager', 'owner'];
            severity = 'warning';
            actionUrl = `/quality-dashboard`;
          }

          if (activity.activity_type === 'task_completed') {
            severity = 'success';
            recipients = [activity.user_email];
          }

          if (activity.activity_type === 'clock_in' || activity.activity_type === 'clock_out') {
            severity = 'info';
            roles = ['manager'];
          }

          // Create event
          await base44.entities.Event.create({
            source_module: activity.activity_type.includes('sop') ? 'sop' :
                          activity.activity_type.includes('quality') ? 'quality' :
                          activity.activity_type.includes('checklist') ? 'checklist' :
                          activity.activity_type.includes('shift') || activity.activity_type.includes('clock') ? 'rota' :
                          'system',
            event_type: activity.activity_type,
            title: activity.title,
            message: activity.description,
            severity,
            recipient_emails: recipients,
            recipient_roles: roles,
            status: 'unread',
            linked_entity_type: 'ActivityLog',
            linked_entity_id: activity.id,
            linked_entity_name: activity.description,
            action_url: actionUrl,
            metadata: activity.metadata || {},
          });
        }

        queryClient.invalidateQueries({ queryKey: ['userEvents'] });

      } catch (error) {
        console.error('[EventProcessor] Error:', error);
      }
    };

    // Run every 30 seconds
    processActivities();
    const interval = setInterval(processActivities, 30 * 1000);

    return () => clearInterval(interval);
  }, [queryClient, safeMode]);

  return null;
}
