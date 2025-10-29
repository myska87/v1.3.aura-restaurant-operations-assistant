/**
 * Shift Notification Engine
 * Sends notifications 15 minutes before shift starts
 */

import { base44 } from '@/api/base44Client';
import CoreDB from './CoreDB';

class ShiftNotificationEngine {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    console.log('[ShiftNotificationEngine] Starting...');
    this.isRunning = true;
    
    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkUpcomingShifts();
    }, 60 * 1000);

    // Run immediately
    this.checkUpcomingShifts();
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('[ShiftNotificationEngine] Stopped');
  }

  async checkUpcomingShifts() {
    try {
      const now = new Date();
      const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
      const today = now.toISOString().split('T')[0];

      // Get today's scheduled shifts
      const shifts = await CoreDB.getShifts({ 
        shift_date: today,
        status: 'scheduled'
      });

      for (const shift of shifts) {
        const shiftStart = new Date(`${shift.shift_date}T${shift.start_time}`);
        
        // Check if shift starts in 12-18 minutes (notification window)
        const minutesUntilShift = (shiftStart - now) / (1000 * 60);
        
        if (minutesUntilShift >= 12 && minutesUntilShift <= 18) {
          await this.sendShiftNotification(shift);
        }
      }
    } catch (error) {
      console.error('[ShiftNotificationEngine] Error:', error);
    }
  }

  async sendShiftNotification(shift) {
    try {
      // Check if notification already sent
      const existingNotifications = await base44.entities.TaskNotification.filter({
        related_shift_id: shift.id,
        notification_type: 'shift_starting_soon'
      });

      if (existingNotifications.length > 0) {
        return; // Already notified
      }

      // Create notification
      await base44.entities.TaskNotification.create({
        notification_type: 'shift_starting_soon',
        recipient_email: shift.staff_email,
        recipient_name: shift.staff_name,
        sender_type: 'system',
        title: '⏰ Your shift starts in 15 minutes',
        message: `Your ${shift.role} shift starts at ${shift.start_time}. Don't forget to clock in!`,
        related_shift_id: shift.id,
        priority: 'info',
        is_read: false,
        action_url: '/clock-in-out'
      });

      console.log(`[ShiftNotificationEngine] Notified ${shift.staff_name} about shift ${shift.id}`);
    } catch (error) {
      console.error('[ShiftNotificationEngine] Error sending notification:', error);
    }
  }
}

export const shiftNotificationEngine = new ShiftNotificationEngine();
export default shiftNotificationEngine;