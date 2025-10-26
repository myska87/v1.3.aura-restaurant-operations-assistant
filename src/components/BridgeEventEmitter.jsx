
/**
 * 🔔 BRIDGE EVENT EMITTER
 * Helper class for modules to emit events to DataBridge
 * Usage: BridgeEventEmitter.emit('task_completed', payload)
 */

import { base44 } from '@/api/base44Client';

export class BridgeEventEmitter {
  /**
   * Emit an event to DataBridge for processing
   */
  static async emit(eventType, payload, options = {}) {
    const {
      sourceModule = 'unknown',
      targetModules = [],
      priority = 'normal',
      referenceId = null,
      referenceType = null,
    } = options;

    try {
      // Get current user for audit trail
      let triggeredBy = null;
      try {
        const user = await base44.auth.me();
        triggeredBy = {
          user: user.email,
          name: user.full_name,
        };
      } catch {
        // User not logged in
      }

      // Create event log entry
      const event = await base44.entities.BridgeEventLog.create({
        event_id: `${sourceModule}_${eventType}_${Date.now()}`,
        source_module: sourceModule,
        event_type: eventType,
        reference_id: referenceId || payload.id || 'unknown',
        reference_type: referenceType || payload.type || 'unknown',
        payload: payload,
        target_modules: targetModules,
        status: 'pending',
        priority: priority,
        triggered_by_user: triggeredBy?.user,
        triggered_by_name: triggeredBy?.name,
      });

      console.log(`[BridgeEventEmitter] Event emitted: ${eventType}`, event.id);

      return event;
    } catch (error) {
      console.error(`[BridgeEventEmitter] Failed to emit event: ${eventType}`, error);
      throw error;
    }
  }

  /**
   * Emit task-related events
   */
  static async emitTaskEvent(eventType, task, user) {
    return this.emit(eventType, {
      task_id: task.id,
      task_name: task.task_name,
      task_type: task.task_type,
      assigned_to_email: task.assigned_to_email,
      assigned_to_name: task.assigned_to_name,
      role: task.role,
      status: task.status,
      shift_id: task.shift_id,
      shift_date: task.shift_date,
      venue_id: task.venue_id,
      venue_name: task.venue_name,
      priority: task.priority,
      completed_by_email: user?.email,
      completed_by_name: user?.full_name,
      completed_at: new Date().toISOString(),
    }, {
      sourceModule: 'tasks',
      targetModules: ['leafe', 'compliance', 'workforce'],
      priority: task.priority || 'normal',
      referenceId: task.id,
      referenceType: 'Task',
    });
  }

  /**
   * Emit shift-related events
   */
  static async emitShiftEvent(eventType, shift, user) {
    return this.emit(eventType, {
      shift_id: shift.id,
      staff_email: shift.staff_email,
      staff_name: shift.staff_name,
      shift_type: shift.shift_type,
      shift_date: shift.shift_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      venue_id: shift.venue_id,
      venue_name: shift.venue_name,
      role: shift.role,
      status: shift.status,
      manager_email: user?.email,
      manager_name: user?.full_name,
    }, {
      sourceModule: 'workforce',
      targetModules: ['leafe', 'tasks', 'compliance'],
      priority: 'normal',
      referenceId: shift.id,
      referenceType: 'Shift',
    });
  }

  /**
   * Emit checklist-related events
   */
  static async emitChecklistEvent(eventType, checklist, user) {
    return this.emit(eventType, {
      checklist_id: checklist.id,
      checklist_name: checklist.template_name,
      venue_id: checklist.venue_id,
      venue_name: checklist.venue_name,
      staff_email: checklist.staff_email,
      staff_name: checklist.staff_name,
      score: checklist.percentage,
      completion_date: checklist.completion_date,
      completed_by_id: user?.id,
      completed_by_email: user?.email,
      completed_by_name: user?.full_name,
      status: checklist.status,
      shift_id: checklist.shift_id,
      shift_date: checklist.shift_date,
    }, {
      sourceModule: 'leafe',
      targetModules: ['compliance', 'workforce'],
      priority: checklist.percentage < 70 ? 'high' : 'normal',
      referenceId: checklist.id,
      referenceType: 'LeafeChecklistEntry',
    });
  }

  /**
   * Emit inventory-related events
   */
  static async emitInventoryEvent(eventType, order, user) {
    return this.emit(eventType, {
      order_id: order.id,
      order_number: order.order_number,
      supplier_id: order.supplier_id,
      supplier_name: order.supplier_name,
      supplier_email: order.supplier_email,
      total: order.total,
      status: order.status,
      received_by: user?.email,
      received_by_name: user?.full_name,
      received_by_id: user?.id,
      delivery_date: order.actual_delivery_date,
    }, {
      sourceModule: 'inventory',
      targetModules: ['compliance'],
      priority: 'normal',
      referenceId: order.id,
      referenceType: 'PurchaseOrder',
    });
  }

  /**
   * Emit document-related events
   */
  static async emitDocumentEvent(eventType, document, user) {
    return this.emit(eventType, {
      document_id: document.id,
      document_type: document.document_type,
      document_title: document.document_name,
      staff_id: user?.id,
      staff_email: user?.email,
      staff_name: user?.full_name,
      signature_url: document.signature_url,
      signed_at: new Date().toISOString(),
    }, {
      sourceModule: 'documents',
      targetModules: ['workforce', 'compliance'],
      priority: 'normal',
      referenceId: document.id,
      referenceType: 'Document',
    });
  }

  /**
   * Emit audit-related events
   */
  static async emitAuditEvent(eventType, audit, user) {
    return this.emit(eventType, {
      audit_id: audit.id,
      venue_id: audit.venue_id,
      venue_name: audit.venue_name,
      audit_type: audit.audit_type,
      overall_score: audit.overall_score,
      inspector_name: audit.inspector_name,
      audit_date: audit.audit_date,
      status: audit.status,
      conducted_by_email: user?.email,
      conducted_by_name: user?.full_name,
    }, {
      sourceModule: 'leafe',
      targetModules: ['compliance'],
      priority: audit.overall_score < 70 ? 'high' : 'normal',
      referenceId: audit.id,
      referenceType: 'LeafeAuditRecord',
    });
  }

  /**
   * Emit hygiene record created event
   */
  static async emitHygieneRecordCreated(record, user) {
    try {
      await base44.entities.BridgeEventLog.create({
        event_id: `hygiene_record_${record.id}_${Date.now()}`,
        source_module: 'hygiene',
        event_type: 'hygiene_record_created',
        reference_id: record.id,
        reference_type: 'HygieneRecord',
        payload: {
          record_id: record.id,
          record_type: record.record_type,
          item_name: record.item_name,
          recorded_value: record.recorded_value,
          is_in_range: record.is_in_range,
          variance_alert: record.variance_alert,
          staff_email: record.recorded_by_email,
          staff_name: record.recorded_by_name,
          venue_id: record.venue_id,
          shift_id: record.shift_id,
          linked_form_id: record.linked_form_id,
          linked_checklist_id: record.linked_checklist_id,
        },
        target_modules: ['compliance', 'leafe', 'forms', 'workforce'],
        status: 'pending',
        priority: record.variance_alert ? 'high' : 'normal',
        triggered_by_user: user?.email,
        triggered_by_name: user?.full_name,
      });
    } catch (error) {
      console.error('[HygieneRecords] Failed to emit event:', error);
    }
  }

  /**
   * Emit temperature alert event
   */
  static async emitTemperatureAlert(alert, record, user) {
    try {
      await base44.entities.BridgeEventLog.create({
        event_id: `temp_alert_${alert.id}_${Date.now()}`,
        source_module: 'hygiene',
        event_type: 'temperature_alert',
        reference_id: alert.id,
        reference_type: 'HygieneAlertLog',
        payload: {
          alert_id: alert.id,
          alert_type: alert.alert_type,
          severity: alert.severity,
          item_name: alert.item_name,
          location: alert.location,
          recorded_value: alert.recorded_value,
          expected_range: alert.expected_range,
          variance_amount: alert.variance_amount,
          venue_id: alert.venue_id,
          record_id: record?.id,
          requires_maintenance: alert.repeat_count > 2,
        },
        target_modules: ['compliance', 'workforce', 'maintenance'],
        status: 'pending',
        priority: alert.severity === 'critical' ? 'critical' : 'high',
        triggered_by_user: user?.email,
        triggered_by_name: user?.full_name,
      });
    } catch (error) {
      console.error('[HygieneRecords] Failed to emit alert event:', error);
    }
  }

  /**
   * Emit achievement unlocked event
   */
  static async emitAchievementUnlocked(staff, badge) {
    try {
      await base44.entities.BridgeEventLog.create({
        event_id: `achievement_${staff.staff_email}_${Date.now()}`,
        source_module: 'hygiene',
        event_type: 'achievement_unlocked',
        reference_id: staff.id,
        reference_type: 'HygieneUserScore',
        payload: {
          staff_email: staff.staff_email,
          staff_name: staff.staff_name,
          badge_name: badge.badge_name,
          badge_icon: badge.badge_icon,
          points_earned: badge.points_value || 0,
          total_points: staff.total_points,
        },
        target_modules: ['workforce', 'compliance'],
        status: 'pending',
        priority: 'normal',
        triggered_by_user: staff.staff_email,
        triggered_by_name: staff.staff_name,
      });
    } catch (error) {
      console.error('[HygieneRecords] Failed to emit achievement event:', error);
    }
  }
}

export default BridgeEventEmitter;
