import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * 📅 FORM SCHEDULER ENGINE
 * Automatically creates form assignments based on schedule (daily/weekly/monthly/6-monthly/yearly)
 * Runs every hour to check for forms that need to be scheduled
 */
export default function FormScheduler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const scheduleForm = async () => {
      try {
        console.log('[FormScheduler] Checking for forms to schedule...');

        // Get all active forms with auto_generate enabled
        const forms = await base44.entities.FormTemplate.filter({
          auto_generate: true,
          is_active: true,
          status: 'active'
        });

        const now = new Date();

        for (const form of forms) {
          // Check if form is due for scheduling
          if (form.next_due_date && new Date(form.next_due_date) <= now) {
            await processScheduledForm(form);
          }
        }
      } catch (error) {
        console.error('[FormScheduler] Error scheduling forms:', error);
      }
    };

    // Check every hour
    const interval = setInterval(scheduleForm, 60 * 60 * 1000);
    scheduleForm(); // Run immediately

    return () => clearInterval(interval);
  }, []);

  const processScheduledForm = async (form) => {
    try {
      console.log(`[FormScheduler] Processing scheduled form: ${form.form_name}`);

      // Find staff members matching the assigned position
      const allUsers = await base44.entities.User.list();
      const matchingStaff = allUsers.filter(user => {
        if (form.assigned_position === 'any') return true;
        return user.position === form.assigned_position;
      });

      if (matchingStaff.length === 0) {
        console.warn(`[FormScheduler] No staff found for position: ${form.assigned_position}`);
        // Still update next due date
        await updateNextDueDate(form);
        return;
      }

      // Create assignment for each matching staff member
      for (const staff of matchingStaff) {
        // Check if assignment already exists for today
        const existingAssignments = await base44.entities.FormAssignmentMetadata.filter({
          form_id: form.id,
          assigned_to_email: staff.email,
          completion_status: 'pending'
        });

        // Check if there's already a recent assignment (within last 12 hours)
        const recentAssignment = existingAssignments.find(a => {
          const assignedTime = new Date(a.assigned_at);
          const hoursDiff = (new Date().getTime() - assignedTime.getTime()) / (1000 * 60 * 60);
          return hoursDiff < 12;
        });

        if (recentAssignment) {
          console.log(`[FormScheduler] Form already assigned recently to ${staff.email}`);
          continue;
        }

        // Calculate due date based on completion deadline
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + (form.completion_deadline_hours || 24));

        // Create assignment
        await base44.entities.FormAssignmentMetadata.create({
          form_id: form.id,
          form_name: form.form_name,
          assignment_type: 'position_based',
          trigger_event: 'scheduled_automatic',
          assigned_to_email: staff.email,
          assigned_to_name: staff.full_name || staff.email,
          assigned_position: staff.position,
          assigned_by: 'system',
          assigned_at: new Date().toISOString(),
          due_date: dueDate.toISOString(),
          completion_status: 'pending',
          metadata: {
            frequency: form.frequency,
            category: form.category,
            auto_generated: true,
            scheduled_date: new Date().toISOString()
          }
        });

        console.log(`[FormScheduler] Created assignment: ${form.form_name} → ${staff.email}`);

        // Emit DataBridge event
        await base44.entities.BridgeEventLog.create({
          event_id: `form_scheduled_${Date.now()}_${staff.email}`,
          source_module: 'formAI',
          event_type: 'form_auto_scheduled',
          reference_id: form.id,
          reference_type: 'FormTemplate',
          payload: {
            form_id: form.id,
            form_name: form.form_name,
            staff_email: staff.email,
            frequency: form.frequency,
            due_date: dueDate.toISOString()
          },
          target_modules: ['workforce', 'notifications'],
          status: 'pending',
          priority: 'normal',
          triggered_by_user: 'system',
          triggered_by_name: 'Form Scheduler'
        });
      }

      // Update next due date
      await updateNextDueDate(form);

    } catch (error) {
      console.error(`[FormScheduler] Error processing form ${form.form_name}:`, error);
    }
  };

  const updateNextDueDate = async (form) => {
    const currentDue = new Date(form.next_due_date || new Date());
    let nextDue = new Date(currentDue);

    switch (form.frequency) {
      case 'daily':
        nextDue.setDate(nextDue.getDate() + 1);
        break;

      case 'weekly':
        nextDue.setDate(nextDue.getDate() + 7);
        break;

      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1);
        // Handle day of month if specified
        if (form.schedule_day_of_month) {
          nextDue.setDate(form.schedule_day_of_month);
        }
        break;

      case 'six_monthly':
        nextDue.setMonth(nextDue.getMonth() + 6);
        break;

      case 'yearly':
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        break;

      default:
        // Custom frequency - default to 1 day
        nextDue.setDate(nextDue.getDate() + 1);
    }

    // Set time if specified
    if (form.schedule_time) {
      const [hours, minutes] = form.schedule_time.split(':');
      nextDue.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    await base44.entities.FormTemplate.update(form.id, {
      next_due_date: nextDue.toISOString()
    });

    console.log(`[FormScheduler] Updated next due date for ${form.form_name}: ${nextDue.toISOString()}`);
  };

  // This component doesn't render anything
  return null;
}