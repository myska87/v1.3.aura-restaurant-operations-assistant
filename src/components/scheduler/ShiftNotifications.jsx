import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInMinutes } from 'date-fns';

/**
 * 📬 Shift Notification System
 * Sends notifications for:
 * - 15 minutes before shift start
 * - Missed clock-ins
 * - End-of-shift checklist reminders
 */

export async function sendShiftReminder(shift) {
  try {
    const notification = await base44.entities.TaskNotification.create({
      notification_type: 'shift_tasks_ready',
      recipient_email: shift.staff_email,
      recipient_name: shift.staff_name,
      sender_type: 'system',
      title: `⏰ Shift Starting Soon!`,
      message: `Your ${shift.role} shift starts in 15 minutes at ${shift.start_time}. Don't forget to clock in!`,
      related_shift_id: shift.id,
      priority: 'info',
      is_read: false,
      action_url: `/ClockInOut`,
    });

    console.log(`[ShiftNotifications] ✅ Reminder sent to ${shift.staff_name}`);
    return notification;
  } catch (error) {
    console.error('[ShiftNotifications] Error sending reminder:', error);
  }
}

export async function sendMissedClockInAlert(shift, managerEmail) {
  try {
    const notification = await base44.entities.ManagerAlert.create({
      alert_type: 'missed_clock_in',
      severity: 'warning',
      staff_email: shift.staff_email,
      staff_name: shift.staff_name,
      shift_id: shift.id,
      shift_date: shift.shift_date,
      scheduled_time: shift.start_time,
      actual_time: new Date().toISOString(),
      minutes_difference: 15,
      message: `${shift.staff_name} has not clocked in for their ${shift.role} shift that started at ${shift.start_time}`,
      status: 'unread',
      auto_notified: true,
      notification_sent_at: new Date().toISOString(),
    });

    console.log(`[ShiftNotifications] ⚠️ Missed clock-in alert sent to manager`);
    return notification;
  } catch (error) {
    console.error('[ShiftNotifications] Error sending alert:', error);
  }
}

export async function sendEndOfShiftReminder(shift) {
  try {
    const notification = await base44.entities.TaskNotification.create({
      notification_type: 'task_completed',
      recipient_email: shift.staff_email,
      recipient_name: shift.staff_name,
      sender_type: 'system',
      title: `✅ Complete Your End-of-Shift Tasks`,
      message: `Your ${shift.role} shift is ending soon. Please complete your closing checklist before clocking out.`,
      related_shift_id: shift.id,
      priority: 'warning',
      is_read: false,
      action_url: `/MyTasks`,
    });

    console.log(`[ShiftNotifications] 📋 End-of-shift reminder sent to ${shift.staff_name}`);
    return notification;
  } catch (error) {
    console.error('[ShiftNotifications] Error sending end reminder:', error);
  }
}

/**
 * Check shifts and send notifications as needed
 * Should be called by a background service every minute
 */
export async function checkAndSendShiftNotifications() {
  try {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayShifts = await base44.entities.Shift.filter({ 
      shift_date: todayStr,
      status: 'scheduled',
    });

    const now = new Date();

    for (const shift of todayShifts) {
      const shiftStart = parseISO(`${shift.shift_date}T${shift.start_time}`);
      const shiftEnd = parseISO(`${shift.shift_date}T${shift.end_time}`);
      const minutesUntilStart = differenceInMinutes(shiftStart, now);
      const minutesUntilEnd = differenceInMinutes(shiftEnd, now);

      // 15 min before start
      if (minutesUntilStart === 15) {
        await sendShiftReminder(shift);
      }

      // 15 min after start (missed clock-in)
      if (minutesUntilStart === -15 && !shift.clock_in_time) {
        // Find manager for this department
        const managers = await base44.entities.User.filter({
          position: { $in: ['manager', 'owner'] },
        });
        if (managers.length > 0) {
          await sendMissedClockInAlert(shift, managers[0].email);
        }
      }

      // 30 min before end
      if (minutesUntilEnd === 30) {
        await sendEndOfShiftReminder(shift);
      }
    }
  } catch (error) {
    console.error('[ShiftNotifications] Error in notification check:', error);
  }
}