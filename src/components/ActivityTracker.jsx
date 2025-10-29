import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * 🤖 Auto Activity Tracking Agent
 * Automatically logs all major activities across the app in real-time
 */
export default function ActivityTracker() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Helper to get current user
    const getCurrentUser = async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    };

    // Helper to log activity
    const logActivity = async (activityData) => {
      try {
        await base44.entities.ActivityLog.create(activityData);
        // Invalidate dashboard queries to refresh
        queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
    };

    // Monitor query cache for activities
    const unsubscribe = queryClient.getQueryCache().subscribe(async (event) => {
      if (event?.type === 'updated') {
        const queryKey = event.query?.queryKey;
        if (!queryKey || !queryKey[0]) return;

        const user = await getCurrentUser();
        if (!user) return;

        const entityName = queryKey[0];

        // Clock In/Out
        if (entityName === 'clockEvents') {
          const data = event.query.state.data;
          if (data && Array.isArray(data) && data.length > 0) {
            const latestEvent = data[0];
            await logActivity({
              activity_type: latestEvent.event_type === 'clock_in' ? 'clock_in' : 'clock_out',
              title: latestEvent.event_type === 'clock_in' ? 'Clocked In' : 'Clocked Out',
              description: `${user.full_name} ${latestEvent.event_type === 'clock_in' ? 'started' : 'ended'} their shift`,
              user_email: user.email,
              user_name: user.full_name,
              icon: 'clock',
              color: latestEvent.event_type === 'clock_in' ? 'green' : 'blue',
              related_entity: 'ClockEvent',
              related_entity_id: latestEvent.id,
            });
          }
        }

        // SOP Created
        if (entityName === 'sops') {
          const data = event.query.state.data;
          if (data && Array.isArray(data) && data.length > 0) {
            const latestSOP = data[0];
            if (latestSOP.created_by === user.email) {
              await logActivity({
                activity_type: 'sop_added',
                title: 'New SOP Created',
                description: `${latestSOP.title}`,
                user_email: user.email,
                user_name: user.full_name,
                icon: 'file',
                color: 'purple',
                related_entity: 'SOPDocument',
                related_entity_id: latestSOP.id,
              });
            }
          }
        }

        // Document Uploaded
        if (entityName === 'documentLibrary') {
          const data = event.query.state.data;
          if (data && Array.isArray(data) && data.length > 0) {
            const latestDoc = data[0];
            if (latestDoc.created_by === user.email) {
              await logActivity({
                activity_type: 'document_uploaded',
                title: 'Document Added',
                description: `${latestDoc.title}`,
                user_email: user.email,
                user_name: user.full_name,
                icon: 'file-text',
                color: 'blue',
                related_entity: 'DocumentBuilder',
                related_entity_id: latestDoc.id,
              });
            }
          }
        }

        // Quality Check
        if (entityName === 'qualityRecords') {
          const data = event.query.state.data;
          if (data && Array.isArray(data) && data.length > 0) {
            const latestCheck = data[0];
            if (latestCheck.checked_by_email === user.email) {
              await logActivity({
                activity_type: 'quality_check',
                title: 'Quality Check Completed',
                description: `${latestCheck.check_title} - ${latestCheck.score}⭐`,
                user_email: user.email,
                user_name: user.full_name,
                icon: 'star',
                color: 'amber',
                related_entity: 'QualityRecord',
                related_entity_id: latestCheck.id,
              });
            }
          }
        }

        // Checklist Completed
        if (entityName === 'checklistExecutions') {
          const data = event.query.state.data;
          if (data && Array.isArray(data) && data.length > 0) {
            const latestChecklist = data[0];
            if (latestChecklist.completed_by_email === user.email && latestChecklist.status === 'completed') {
              await logActivity({
                activity_type: 'checklist_completed',
                title: 'Checklist Completed',
                description: `${latestChecklist.template_name}`,
                user_email: user.email,
                user_name: user.full_name,
                icon: 'clipboard-check',
                color: 'green',
                related_entity: 'ChecklistExecution',
                related_entity_id: latestChecklist.id,
              });
            }
          }
        }

        // Form Submitted
        if (entityName === 'formResponses') {
          const data = event.query.state.data;
          if (data && Array.isArray(data) && data.length > 0) {
            const latestForm = data[0];
            if (latestForm.staff_email === user.email && latestForm.status === 'submitted') {
              await logActivity({
                activity_type: 'form_submitted',
                title: 'Form Submitted',
                description: `${latestForm.form_name}`,
                user_email: user.email,
                user_name: user.full_name,
                icon: 'form',
                color: 'indigo',
                related_entity: 'FormResponse',
                related_entity_id: latestForm.id,
              });
            }
          }
        }

        // Task Completed
        if (entityName === 'staffTasks' || entityName === 'myTasks') {
          const data = event.query.state.data;
          if (data && Array.isArray(data) && data.length > 0) {
            const latestTask = data[0];
            if (latestTask.assigned_to === user.email && latestTask.status === 'completed') {
              await logActivity({
                activity_type: 'task_completed',
                title: 'Task Completed',
                description: `${latestTask.task_name}`,
                user_email: user.email,
                user_name: user.full_name,
                icon: 'check',
                color: 'green',
                related_entity: 'StaffTask',
                related_entity_id: latestTask.id,
              });
            }
          }
        }
      }
    });

    // Cleanup
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [queryClient]);

  // Invisible component
  return null;
}