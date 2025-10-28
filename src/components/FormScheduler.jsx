
import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * 📅 FORM SCHEDULER ENGINE
 * Automatically creates form assignments based on schedule (daily/weekly/monthly/6-monthly/yearly)
 * Handles post-submission rescheduling and reminder notifications
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

        // Process reminder notifications
        await processReminders();

        // Check for overdue forms and escalate
        await checkOverdueForms();
        
      } catch (error) {
        console.error('[FormScheduler] Error scheduling forms:', error);
      }
    };

    // Check every 5 minutes for more responsive reminders
    const interval = setInterval(scheduleForm, 5 * 60 * 1000);
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

        // Find matching shift if possible (via DataBridge)
        const todayShifts = await base44.entities.Shift.filter({
          staff_email: staff.email,
          shift_date: new Date().toISOString().split('T')[0]
        });

        const matchingShift = todayShifts.find(shift => {
          if (form.trigger_type === 'shift_start' || form.trigger_type === 'opening') {
            return shift.shift_type === 'opening';
          }
          if (form.trigger_type === 'shift_end' || form.trigger_type === 'closing') {
            return shift.shift_type === 'closing';
          }
          if (form.trigger_type === 'mid_day') {
            return shift.shift_type === 'mid_shift';
          }
          return true;
        });

        // Create assignment
        const assignment = await base44.entities.FormAssignmentMetadata.create({
          form_id: form.id,
          form_name: form.form_name,
          assignment_type: 'position_based',
          trigger_event: 'scheduled_automatic',
          linked_shift_id: matchingShift?.id,
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
            scheduled_date: new Date().toISOString(),
            shift_type: matchingShift?.shift_type
          }
        });

        console.log(`[FormScheduler] Created assignment: ${form.form_name} → ${staff.email}`);

        // Emit DataBridge event for shift attachment
        await base44.entities.BridgeEventLog.create({
          event_id: `form_scheduled_${Date.now()}_${staff.email}`,
          source_module: 'formAI',
          event_type: 'form_auto_scheduled',
          reference_id: form.id,
          reference_type: 'FormTemplate',
          payload: {
            form_id: form.id,
            form_name: form.form_name,
            assignment_id: assignment.id,
            staff_email: staff.email,
            shift_id: matchingShift?.id,
            frequency: form.frequency,
            due_date: dueDate.toISOString()
          },
          target_modules: ['workforce', 'notifications', 'hygiene'],
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
        nextDue.setDate(nextDue.getDate() + 1);
    }

    if (form.schedule_time) {
      const [hours, minutes] = form.schedule_time.split(':');
      nextDue.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    await base44.entities.FormTemplate.update(form.id, {
      next_due_date: nextDue.toISOString()
    });

    console.log(`[FormScheduler] Updated next due date for ${form.form_name}: ${nextDue.toISOString()}`);
  };

  /**
   * Send reminder notifications 15 minutes before due time
   */
  const processReminders = async () => {
    try {
      const now = new Date();
      const reminderWindow = new Date(now.getTime() + 15 * 60 * 1000); // 15 min from now

      // Get pending assignments due within 15 minutes
      const assignments = await base44.entities.FormAssignmentMetadata.filter({
        completion_status: 'pending',
        reminder_sent: false
      });

      for (const assignment of assignments) {
        const dueDate = new Date(assignment.due_date);
        
        // Check if due time is within reminder window
        if (dueDate <= reminderWindow && dueDate > now) {
          // Send notification
          await base44.entities.TaskNotification.create({
            notification_type: 'reminder',
            recipient_email: assignment.assigned_to_email,
            recipient_name: assignment.assigned_to_name,
            sender_type: 'system',
            title: `⏰ Form Due Soon: ${assignment.form_name}`,
            message: `Your form "${assignment.form_name}" is due in 15 minutes. Please complete it on time to maintain compliance.`,
            related_task_id: assignment.form_id,
            priority: 'warning',
            is_read: false,
            action_url: `/forms/fill?assignment=${assignment.id}`,
            metadata: {
              assignment_id: assignment.id,
              due_date: assignment.due_date
            }
          });

          // Mark reminder as sent
          await base44.entities.FormAssignmentMetadata.update(assignment.id, {
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString()
          });

          console.log(`[FormScheduler] Sent reminder for ${assignment.form_name} to ${assignment.assigned_to_email}`);
        }
      }
    } catch (error) {
      console.error('[FormScheduler] Error processing reminders:', error);
    }
  };

  /**
   * Check for overdue forms and escalate
   */
  const checkOverdueForms = async () => {
    try {
      const now = new Date();
      const assignments = await base44.entities.FormAssignmentMetadata.filter({
        completion_status: 'pending'
      });

      for (const assignment of assignments) {
        const dueDate = new Date(assignment.due_date);
        const hoursOverdue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);

        if (hoursOverdue > 0) {
          // Update status to overdue
          await base44.entities.FormAssignmentMetadata.update(assignment.id, {
            completion_status: 'overdue'
          });

          // If overdue > 24h, escalate to compliance dashboard
          if (hoursOverdue > 24) {
            await base44.entities.BridgeEventLog.create({
              event_id: `form_overdue_escalate_${Date.now()}_${assignment.id}`,
              source_module: 'formAI',
              event_type: 'form_overdue_escalation',
              reference_id: assignment.id,
              reference_type: 'FormAssignmentMetadata',
              payload: {
                assignment_id: assignment.id,
                form_name: assignment.form_name,
                staff_email: assignment.assigned_to_email,
                hours_overdue: Math.round(hoursOverdue),
                due_date: assignment.due_date
              },
              target_modules: ['compliance', 'hygiene', 'management'],
              status: 'pending',
              priority: 'urgent',
              triggered_by_user: 'system',
              triggered_by_name: 'Form Scheduler'
            });

            console.log(`[FormScheduler] Escalated overdue form: ${assignment.form_name}`);
          }
        }
      }
    } catch (error) {
      console.error('[FormScheduler] Error checking overdue forms:', error);
    }
  };

  return null;
}

/**
 * Handle post-submission rescheduling
 * Called when a form is submitted
 */
export async function handleFormSubmission(formResponse, template) {
  try {
    console.log('[FormScheduler] Handling form submission for rescheduling');

    // If auto_generate is enabled, create next scheduled copy
    if (template.auto_generate) {
      // Find the current assignment
      const assignment = await base44.entities.FormAssignmentMetadata.filter({
        form_id: template.id,
        form_response_id: formResponse.id
      });

      if (assignment.length > 0) {
        // Mark current assignment as completed
        await base44.entities.FormAssignmentMetadata.update(assignment[0].id, {
          completion_status: 'completed',
          completed_at: new Date().toISOString(),
          form_response_id: formResponse.id
        });
      }

      // Schedule next occurrence immediately
      const nextDue = calculateNextDueDate(template);
      
      await base44.entities.FormTemplate.update(template.id, {
        next_due_date: nextDue.toISOString()
      });

      console.log('[FormScheduler] Scheduled next occurrence after submission');
    }

    // Emit completion event to DataBridge
    await base44.entities.BridgeEventLog.create({
      event_id: `form_completed_${Date.now()}_${formResponse.id}`,
      source_module: 'formAI',
      event_type: 'form_completed',
      reference_id: formResponse.id,
      reference_type: 'FormResponse',
      payload: {
        form_id: template.id,
        form_name: template.form_name,
        response_id: formResponse.id,
        staff_email: formResponse.staff_email,
        status: formResponse.status,
        score: formResponse.score
      },
      target_modules: ['compliance', 'hygiene', 'workforce'],
      status: 'pending',
      priority: 'normal',
      triggered_by_user: formResponse.staff_email,
      triggered_by_name: formResponse.staff_name
    });

  } catch (error) {
    console.error('[FormScheduler] Error handling form submission:', error);
  }
}

function calculateNextDueDate(template) {
  const now = new Date();
  let nextDue = new Date(now);

  switch (template.frequency) {
    case 'daily':
      nextDue.setDate(nextDue.getDate() + 1);
      break;
    case 'weekly':
      nextDue.setDate(nextDue.getDate() + 7);
      break;
    case 'monthly':
      nextDue.setMonth(nextDue.getMonth() + 1);
      break;
    case 'six_monthly':
      nextDue.setMonth(nextDue.getMonth() + 6);
      break;
    case 'yearly':
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      break;
  }

  if (template.schedule_time) {
    const [hours, minutes] = template.schedule_time.split(':');
    nextDue.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  return nextDue;
}
